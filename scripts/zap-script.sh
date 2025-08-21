#!/bin/bash

docker pull zaproxy/zap-stable
docker run -i zaproxy/zap-stable zap-baseline.py -t "https://frontend-production-1884.up.railway.app/" -l PASS > zap_baseline_report.html

echo $? > /dev/null
