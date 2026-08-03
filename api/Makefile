CUR_DIR    = $(shell pwd)
DEPLOY_DIR = $(CUR_DIR)/../deploy

.PHONY: build zip clean type-check test test-watch deploy-dev deploy-staging deploy-prod

build:
	npm run build

zip:
	npm run build:zip

clean:
	npm run clean

type-check:
	npm run type-check

test:
	npm test

test-watch:
	npm run test:watch

# Build, zip, then run terraform apply for the target environment.
# Usage: make deploy-dev | make deploy-staging | make deploy-prod
deploy-dev: zip
	cd $(DEPLOY_DIR) && make apply-dev

deploy-staging: zip
	cd $(DEPLOY_DIR) && make apply-staging

deploy-prod: zip
	cd $(DEPLOY_DIR) && make apply-prod
