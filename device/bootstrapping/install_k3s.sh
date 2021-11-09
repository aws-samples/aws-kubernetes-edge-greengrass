#!/bin/bash

# Install k3s 

K3S_EXISTS=false
K3S_RUNNING=`systemctl show -p SubState --value k3s.service`

FILE=/usr/local/bin/k3s
if test -f "$FILE"; then
    echo "$FILE exists. k3s is installed"
    K3S_EXISTS=true
fi

if [ "$K3S_EXISTS" = false ] ; then
  export K3S_KUBECONFIG_MODE="644"
  sudo -E curl -sfL https://get.k3s.io | sh -  
else
  if [ "$K3S_RUNNING" = false ] ; then
    echo "Restarting service k3s"
    sudo systemctl restart k3s
  else
    echo "k3s is already running"
  fi
fi

# k3s now is running
# Now we're writing the current IP to SSM Parameter Store
# And kubeconfig to S3 bucket

ipv4=$(/sbin/ip -o -4 addr list eth0 | awk '{print $4}' | cut -d/ -f1)
aws ssm put-parameter --name "/k3s/kubernetes/ip" --type "String" --value $ipv4 --overwrite

sed "s/127.0.0.1/$ipv4/" /etc/rancher/k3s/k3s.yaml > ~/kubeconfig-k3s

S3_BUCKET=`aws ssm get-parameters --names "/k3s/kubernetes/s3-bucket" | jq .Parameters[].Value | sed 's/\"//g'`
aws s3 cp ~/kubeconfig-k3s s3://$S3_BUCKET/kubeconfig-k3s
