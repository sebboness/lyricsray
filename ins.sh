#!/bin/bash
trap 'kill 0' EXIT

clear

(cd api && npm i) &
(cd web && npm i) &

wait
