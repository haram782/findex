#!/bin/sh
set -eu

printenv > /etc/environment
exec cron -f
