#!/usr/bin/env bash
set -e

if [ ! -f "$1" ]; then
    echo "$1 does not exist."
   exit 1
fi

SHA=`cat $1 | openssl dgst -binary -sha256 | openssl base64`
BIN=`cat $1 | openssl dgst -sha256 | awk '{print $2}'`

echo "{ \"filebase64sha256\": \"$SHA\", \"binary\": \"$BIN\", \"status\": \"success\" }"