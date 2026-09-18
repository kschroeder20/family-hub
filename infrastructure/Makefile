.PHONY: install bootstrap synth diff build-lambda deploy deploy-web create-user destroy-auth clean

# The CDK CLI (`npm install -g aws-cdk`) is a Node tool, not something pip
# installs -- we just need it to run `python3 app.py` through the venv that
# has aws-cdk-lib installed, so prepend the venv's bin dir to PATH.
CDK := PATH="$(CURDIR)/.venv/bin:$$PATH" cdk
PYTHON := .venv/bin/python3

STACK_AUTH := FamilyHubAuth
STACK_DATA := FamilyHubData
STACK_WEB := FamilyHubWeb
STACK_API := FamilyHubApi

# Usage: $(call stack_output,StackName,OutputKey)
define stack_output
$(shell aws cloudformation describe-stacks --stack-name $(1) \
	--query "Stacks[0].Outputs[?OutputKey=='$(2)'].OutputValue" --output text 2>/dev/null)
endef

# aws-cdk-lib needs Python 3.9+; picks the newest available interpreter
# rather than assuming `python3` is new enough.
PY := $(shell command -v python3.13 || command -v python3.12 || command -v python3.11 || command -v python3.10 || command -v python3.9 || command -v python3)

.venv/bin/python3:
	$(PY) -m venv .venv
	.venv/bin/pip install --upgrade pip -q
	.venv/bin/pip install -r requirements.txt -q

install: .venv/bin/python3
	@command -v cdk >/dev/null || \
		(echo "The CDK CLI isn't installed -- run 'npm install -g aws-cdk'." && exit 1)

bootstrap: install
	$(CDK) bootstrap

synth: install
	$(CDK) synth

diff: install
	$(CDK) diff

build-lambda:
	cd ../serverless && npm install && npm run build

# Deploys everything: Cognito + DynamoDB + Lambda/API Gateway + S3/
# CloudFront. The Web stack won't have any frontend content on a first
# deploy (FamilyHubWeb only pushes frontend/dist if it already exists),
# so this is a two-pass flow:
#   1. `make deploy`      -> get ApiUrl + SiteUrl + Cognito IDs
#   2. build frontend/ with VITE_API_URL=<ApiUrl> and the Cognito IDs
#   3. `make deploy-web` to publish the built frontend to the bucket
deploy: install build-lambda
	$(CDK) deploy $(STACK_AUTH) $(STACK_DATA) $(STACK_WEB) $(STACK_API) --require-approval never
	@echo ""
	@echo "ApiUrl=$(call stack_output,$(STACK_API),ApiUrl)"
	@echo "SiteUrl=$(call stack_output,$(STACK_WEB),SiteUrl)"
	@echo "COGNITO_USER_POOL_ID=$(call stack_output,$(STACK_AUTH),UserPoolId)"
	@echo "COGNITO_CLIENT_ID=$(call stack_output,$(STACK_AUTH),UserPoolClientId)"
	@echo ""
	@echo "Next: build frontend/ with VITE_API_URL=<ApiUrl above> and VITE_COGNITO_* set,"
	@echo "then run 'make deploy-web' to publish it."

deploy-web: install
	$(CDK) deploy $(STACK_WEB) --require-approval never
	@echo ""
	@echo "SiteUrl=$(call stack_output,$(STACK_WEB),SiteUrl)"

# Creates a Cognito login for one family member. The temporary password is
# printed once -- share it with them directly (text, in person, etc); they
# set their own password on first login.
create-user:
	@test -n "$(EMAIL)" && test -n "$(NAME)" || \
		(echo "Usage: make create-user EMAIL=someone@example.com NAME=Someone" && exit 1)
	$(eval USER_POOL_ID := $(call stack_output,$(STACK_AUTH),UserPoolId))
	@test -n "$(USER_POOL_ID)" || (echo "Auth stack isn't deployed yet -- run 'make deploy' first." && exit 1)
	$(eval TEMP_PASSWORD := $(shell $(PYTHON) -c "import secrets,string; c=string.ascii_letters+string.digits; print('Aa1!' + ''.join(secrets.choice(c) for _ in range(12)))"))
	aws cognito-idp admin-create-user \
		--user-pool-id $(USER_POOL_ID) \
		--username "$(EMAIL)" \
		--user-attributes Name=email,Value="$(EMAIL)" Name=email_verified,Value=true Name=given_name,Value="$(NAME)" \
		--temporary-password "$(TEMP_PASSWORD)" \
		--message-action SUPPRESS
	@echo ""
	@echo "Created $(EMAIL). Temporary password (share this with them directly): $(TEMP_PASSWORD)"
	@echo "They'll be prompted to set their own password on first login."

# Only tears down the auth stack -- Data/Web/Api aren't included here on
# purpose, since accidentally destroying them (even with RemovalPolicy.
# RETAIN protecting the actual tables/bucket) is a bigger foot-gun than
# the convenience is worth. Use `cdk destroy <StackName>` directly if you
# really need to tear one of those down.
destroy-auth: install
	$(CDK) destroy $(STACK_AUTH)

clean:
	rm -rf .venv cdk.out
