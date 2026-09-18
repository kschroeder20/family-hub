import os

from aws_cdk import CfnOutput, Duration, Stack
from aws_cdk import aws_apigatewayv2 as apigwv2
from aws_cdk import aws_apigatewayv2_authorizers as authorizers
from aws_cdk import aws_apigatewayv2_integrations as integrations
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_lambda as lambda_
from constructs import Construct

# Every /api/v1/google_calendar/* route needs the Cognito authorizer *except*
# the OAuth callback -- Google's redirect hits it directly with no bearer
# token to attach. See serverless/src/handlers/googleCalendar.ts.
PROTECTED_ROUTES = [
    ("GET", "/api/v1/family_members"),
    ("GET", "/api/v1/chores"),
    ("POST", "/api/v1/chores"),
    ("GET", "/api/v1/chores/{id}"),
    ("PUT", "/api/v1/chores/{id}"),
    ("PATCH", "/api/v1/chores/{id}"),
    ("DELETE", "/api/v1/chores/{id}"),
    ("GET", "/api/v1/recurring_chores"),
    ("POST", "/api/v1/recurring_chores"),
    ("POST", "/api/v1/recurring_chores/{id}/complete"),
    ("GET", "/api/v1/recurring_chores/{id}"),
    ("PUT", "/api/v1/recurring_chores/{id}"),
    ("PATCH", "/api/v1/recurring_chores/{id}"),
    ("DELETE", "/api/v1/recurring_chores/{id}"),
    ("DELETE", "/api/v1/grocery_items/clear_purchased"),
    ("GET", "/api/v1/grocery_items"),
    ("POST", "/api/v1/grocery_items"),
    ("GET", "/api/v1/grocery_items/{id}"),
    ("PUT", "/api/v1/grocery_items/{id}"),
    ("PATCH", "/api/v1/grocery_items/{id}"),
    ("DELETE", "/api/v1/grocery_items/{id}"),
    ("GET", "/api/v1/google_calendar/sync"),
    ("POST", "/api/v1/google_calendar/create"),
    ("PATCH", "/api/v1/google_calendar/events/{id}"),
    ("DELETE", "/api/v1/google_calendar/events/{id}"),
    ("GET", "/api/v1/google_calendar/authorize"),
    ("DELETE", "/api/v1/google_calendar/credentials"),
]

PUBLIC_ROUTES = [
    ("GET", "/api/v1/google_calendar/callback"),
    ("GET", "/auth/google_oauth2/callback"),
    ("GET", "/oauth2callback"),
]

_METHOD_MAP = {
    "GET": apigwv2.HttpMethod.GET,
    "POST": apigwv2.HttpMethod.POST,
    "PUT": apigwv2.HttpMethod.PUT,
    "PATCH": apigwv2.HttpMethod.PATCH,
    "DELETE": apigwv2.HttpMethod.DELETE,
}


class ApiStack(Stack):
    """Lambda + API Gateway HTTP API fronting the app's serverless backend
    (see ../../serverless). One Lambda handles every route -- see
    serverless/src/main.ts for the in-process router -- fronted by a
    Cognito JWT authorizer reusing the FamilyHubAuth user pool.

    Google Calendar credentials (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI/
    CALENDAR_ID) are read from the deployer's environment at synth time --
    no secret store introduced here.

    The Lambda code is bundled ahead of time by `npm run build` in
    ../../serverless (esbuild -> serverless/dist/main.js), not by CDK's
    NodejsFunction auto-bundler -- that construct's Docker fallback tried to
    pull a ~1GB SAM build image mid-development and caused a disk-space
    outage. Run the build before `cdk synth`/`cdk deploy`.
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        user_pool: cognito.UserPool,
        user_pool_client: cognito.UserPoolClient,
        tables: dict[str, dynamodb.Table],
        frontend_origin: str = "*",
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        dist_dir = "../serverless/dist"
        if not os.path.isfile(os.path.join(dist_dir, "main.js")):
            raise RuntimeError(
                f"{dist_dir}/main.js not found -- run `npm run build` in serverless/ before synth/deploy."
            )

        fn = lambda_.Function(
            self,
            "ApiFunction",
            runtime=lambda_.Runtime.NODEJS_22_X,
            handler="main.handler",
            code=lambda_.Code.from_asset(dist_dir),
            memory_size=256,
            timeout=Duration.seconds(15),
            environment={
                "CHORES_TABLE": tables["chores"].table_name,
                "RECURRING_CHORES_TABLE": tables["recurring_chores"].table_name,
                "RECURRING_CHORE_COMPLETIONS_TABLE": tables["recurring_chore_completions"].table_name,
                "GROCERY_ITEMS_TABLE": tables["grocery_items"].table_name,
                "GOOGLE_CREDENTIALS_TABLE": tables["google_credentials"].table_name,
                "GOOGLE_CLIENT_ID": os.environ.get("GOOGLE_CLIENT_ID", ""),
                "GOOGLE_CLIENT_SECRET": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
                "GOOGLE_REDIRECT_URI": os.environ.get("GOOGLE_REDIRECT_URI", ""),
                "GOOGLE_CALENDAR_ID": os.environ.get("GOOGLE_CALENDAR_ID", ""),
            },
        )

        for table in tables.values():
            table.grant_read_write_data(fn)

        issuer = f"https://cognito-idp.{Stack.of(self).region}.amazonaws.com/{user_pool.user_pool_id}"
        jwt_authorizer = authorizers.HttpJwtAuthorizer(
            "CognitoAuthorizer",
            issuer,
            jwt_audience=[user_pool_client.user_pool_client_id],
        )

        http_api = apigwv2.HttpApi(
            self,
            "HttpApi",
            api_name="family-hub-api",
            cors_preflight=apigwv2.CorsPreflightOptions(
                allow_origins=[frontend_origin],
                allow_methods=[
                    apigwv2.CorsHttpMethod.GET,
                    apigwv2.CorsHttpMethod.POST,
                    apigwv2.CorsHttpMethod.PUT,
                    apigwv2.CorsHttpMethod.PATCH,
                    apigwv2.CorsHttpMethod.DELETE,
                ],
                allow_headers=["authorization", "content-type"],
                allow_credentials=frontend_origin != "*",
                max_age=Duration.hours(1),
            ),
            default_domain_mapping=None,
            create_default_stage=True,
        )

        # Roughly matches the old Rack::Attack posture (100 req/min ~= 1.7
        # req/s overall) without needing a rate-limiting gem -- API Gateway
        # throttles before the request ever reaches Lambda or DynamoDB.
        stage = http_api.default_stage.node.default_child
        stage.default_route_settings = apigwv2.CfnStage.RouteSettingsProperty(
            throttling_burst_limit=20,
            throttling_rate_limit=5,
        )

        integration = integrations.HttpLambdaIntegration("ApiIntegration", fn)

        for method, path in PROTECTED_ROUTES:
            http_api.add_routes(
                path=path,
                methods=[_METHOD_MAP[method]],
                integration=integration,
                authorizer=jwt_authorizer,
            )

        for method, path in PUBLIC_ROUTES:
            http_api.add_routes(
                path=path,
                methods=[_METHOD_MAP[method]],
                integration=integration,
            )

        self.api_url = http_api.url
        CfnOutput(self, "ApiUrl", value=http_api.url or "")
