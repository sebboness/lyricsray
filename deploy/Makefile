CUR_DIR = $(shell pwd)
TERRAFORM_DIR = $(CUR_DIR)/terraform

.PHONY: init
init:
	cd ${TERRAFORM_DIR} \
	&& terraform init \

.PHONY: plan
plan:
	cd ${TERRAFORM_DIR} \
	&& terraform workspace select $(env) \
	&& terraform plan

.PHONY: apply
apply:
	cd ${TERRAFORM_DIR} \
	&& terraform workspace select $(env) \
	&& terraform apply -auto-approve

.PHONY: plan-destroy
plan-destroy:
	cd ${TERRAFORM_DIR} \
	&& terraform workspace select $(env) \
	&& terraform plan -destroy

.PHONY: destroy
destroy:
	cd ${TERRAFORM_DIR} \
	&& terraform workspace select $(env) \
	&& terraform apply -destroy -auto-approve

# DEV
plan-dev: 
	$(MAKE) plan env=default

apply-dev:
	$(MAKE) apply env=default

plan-destroy-dev:
	$(MAKE) plan-destroy env=default

destroy-dev:
	$(MAKE) destroy env=default

# STAGING
plan-staging: 
	$(MAKE) plan env=staging

apply-staging:
	$(MAKE) apply env=staging

plan-destroy-staging:
	$(MAKE) plan-destroy env=staging

destroy-staging:
	$(MAKE) destroy env=staging

# PRODUCTION
plan-prod: 
	$(MAKE) plan env=prod

apply-prod:
	$(MAKE) apply env=prod

plan-destroy-prod:
	$(MAKE) plan-destroy env=prod

destroy-prod:
	$(MAKE) destroy env=prod