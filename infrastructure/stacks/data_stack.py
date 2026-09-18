from aws_cdk import RemovalPolicy, Stack
from aws_cdk import aws_dynamodb as dynamodb
from constructs import Construct


class DataStack(Stack):
    """DynamoDB tables backing the serverless API (see ../../serverless).

    Mirrors the old Postgres schema one table per model, each keyed by a
    UUID `id` (string) except google_credentials, which is keyed by the
    fixed 'default' user id. `chores` and `grocery_items` carry a TTL
    attribute (`expiresAt`) that replaces the old CleanupCompletedItemsJob
    cron -- DynamoDB expires those items itself, typically within 48 hours
    of the TTL timestamp (not instant, but fine for a "tidy up after a
    couple of days" job).

    family_members isn't a table at all -- it's a fixed, read-only list of
    4 rows baked into the Lambda (see serverless/src/domain/familyMembers.ts).

    Retained on stack deletion, matching AuthStack's posture: losing chores/
    groceries to an accidental `cdk destroy` is a worse day than losing a
    little tidiness in the removal-policy story.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.chores_table = dynamodb.Table(
            self,
            "ChoresTable",
            table_name="family_hub_chores",
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="expiresAt",
            removal_policy=RemovalPolicy.RETAIN,
        )

        self.recurring_chores_table = dynamodb.Table(
            self,
            "RecurringChoresTable",
            table_name="family_hub_recurring_chores",
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
        )

        self.recurring_chore_completions_table = dynamodb.Table(
            self,
            "RecurringChoreCompletionsTable",
            table_name="family_hub_recurring_chore_completions",
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
        )

        self.grocery_items_table = dynamodb.Table(
            self,
            "GroceryItemsTable",
            table_name="family_hub_grocery_items",
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="expiresAt",
            removal_policy=RemovalPolicy.RETAIN,
        )

        self.google_credentials_table = dynamodb.Table(
            self,
            "GoogleCredentialsTable",
            table_name="family_hub_google_credentials",
            partition_key=dynamodb.Attribute(name="userId", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN,
        )
