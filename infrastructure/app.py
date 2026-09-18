#!/usr/bin/env python3
import os

import aws_cdk as cdk

from stacks.api_stack import ApiStack
from stacks.auth_stack import AuthStack
from stacks.data_stack import DataStack
from stacks.web_stack import WebStack

app = cdk.App()

env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION"),
)

auth_stack = AuthStack(app, "FamilyHubAuth", env=env)
data_stack = DataStack(app, "FamilyHubData", env=env)
web_stack = WebStack(app, "FamilyHubWeb", env=env)

# CORS is locked to FamilyHubWeb's own CloudFront domain via a real
# cross-stack reference (not an env var) -- a stray deploy without
# FRONTEND_ORIGIN set previously silently reopened CORS to '*'. Override
# with FRONTEND_ORIGIN only if you've since put a custom domain in front of
# CloudFront and want the API to trust that origin instead.
default_frontend_origin = f"https://{web_stack.distribution_domain_name}"

api_stack = ApiStack(
    app,
    "FamilyHubApi",
    env=env,
    user_pool=auth_stack.user_pool,
    user_pool_client=auth_stack.user_pool_client,
    tables={
        "chores": data_stack.chores_table,
        "recurring_chores": data_stack.recurring_chores_table,
        "recurring_chore_completions": data_stack.recurring_chore_completions_table,
        "grocery_items": data_stack.grocery_items_table,
        "google_credentials": data_stack.google_credentials_table,
    },
    frontend_origin=os.environ.get("FRONTEND_ORIGIN", default_frontend_origin),
)
api_stack.add_stack_dependency(auth_stack)
api_stack.add_stack_dependency(data_stack)
api_stack.add_stack_dependency(web_stack)

app.synth()
