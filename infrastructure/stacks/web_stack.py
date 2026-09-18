import os

from aws_cdk import CfnOutput, RemovalPolicy, Stack
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk import aws_cloudfront_origins as origins
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_deployment as s3deploy
from constructs import Construct


class WebStack(Stack):
    """S3 + CloudFront hosting for the built frontend SPA.

    CloudFront gives a free HTTPS endpoint on an *.cloudfront.net domain --
    no ACM cert request, no Route 53 zone, no domain purchase required to
    get started. The 404/403 -> index.html error mapping is what makes
    client-side routing (react-router-style deep links) work.

    Expects `frontend/dist` (the Vite build output) to already exist --
    run `npm run build` in frontend/ before `cdk deploy`.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        bucket = s3.Bucket(
            self,
            "SiteBucket",
            removal_policy=RemovalPolicy.RETAIN,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
        )

        distribution = cloudfront.Distribution(
            self,
            "SiteDistribution",
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403, response_http_status=200, response_page_path="/index.html"
                ),
                cloudfront.ErrorResponse(
                    http_status=404, response_http_status=200, response_page_path="/index.html"
                ),
            ],
        )

        dist_dir = "../frontend/dist"
        if os.path.isdir(dist_dir):
            s3deploy.BucketDeployment(
                self,
                "DeploySite",
                sources=[s3deploy.Source.asset(dist_dir)],
                destination_bucket=bucket,
                distribution=distribution,
                distribution_paths=["/*"],
            )

        self.distribution_domain_name = distribution.distribution_domain_name
        CfnOutput(self, "SiteUrl", value=f"https://{distribution.distribution_domain_name}")
