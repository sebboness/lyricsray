#!/usr/bin/env bash
set -e

if [[ "$1" == "dev" || "$1" == "prod" ]]; then
    app_env=$1

    echo "Variables set to:"
    echo "    app_env  = $app_env"

    [[ "$app_env" == "dev" ]] && app_id="d206abp9pyqklk"
    [[ "$app_env" == "dev" ]] && role_arn="arn:aws:iam::902557199875:role/lyricsray-amplify-role-dev"
    
    [[ "$app_env" == "prod" ]] && app_id="123"
    [[ "$app_env" == "prod" ]] && role_arn="arn:aws:iam::902557199875:role/lyricsray-amplify-role-prod"

    echo "    app_id   = $app_id"
    echo "    role_arn = $role_arn"

    echo ""
    echo "Running make apply-$app_env"
    make apply-$app_env

    export AWS_PAGER=""

    aws amplify update-branch \
        --app-id $app_id \
        --branch-name $app_env \
        --compute-role-arn $role_arn
else
    echo "env argument must be dev or prod (i.e. './apply_infra.sh dev')."
    exit 1
fi
