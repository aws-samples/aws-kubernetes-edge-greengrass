#!/bin/bash

# Check if AWS CLI is configured correctly
AWS_REGION=`aws configure get region`

if [ -z "$AWS_REGION" ]
then  
  echo "Region is empty, stopping installation. Please configure AWS CLI properly."  
  exit 1
else  
  echo "Using AWS Region $AWS_REGION"
fi

# Update package
sudo apt update -y
sudo apt upgrade -y

# Install Pip3, jq, and AWS CLI
sudo apt install python3-pip jq docker.io -y
pip3 install awscli --upgrade --user

# Add user Pi to docker group

sudo usermod -aG docker pi
sudo systemctl enable docker

# Activate kernel features

KERNEL_FEATURES=' cgroup_enable=cpuset cgroup_enable=memory cgroup_memory=1 swapaccount=1'

if ! grep -q "cgroup_enable=memory"  "/boot/cmdline.txt"; then
  echo "Writing $KERNEL_FEATURES into /boot/cmdline.txt"
  sudo sed -i '$ s/$/ cgroup_enable=cpuset cgroup_enable=memory cgroup_memory=1 swapaccount=1/' /boot/cmdline.txt
fi

# Activate SSH
sudo systemctl enable ssh
sudo systemctl start ssh

# Create log directory for Greengrass
mkdir -p ~/greengrass/v2/logs
mkdir -p /home/pi/redis/orders/data

# Reading ActivateId and ActivationCode from SSM Parameter Store

SSM_ACTIVATION_CODE=`aws secretsmanager get-secret-value --secret-id k3s-activation-secret --query SecretString --output text | jq --raw-output '.["activation-code"]'`  
SSM_ACTIVATION_ID=`aws secretsmanager get-secret-value --secret-id k3s-activation-secret --query SecretString --output text | jq --raw-output '.["activation-id"]'`
AWS_REGION=`aws configure get region`

# Install SSM
mkdir -p /tmp/ssm
sudo curl https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_arm/amazon-ssm-agent.deb -o /tmp/ssm/amazon-ssm-agent.deb
sudo dpkg -i /tmp/ssm/amazon-ssm-agent.deb
sudo service amazon-ssm-agent stop
sudo amazon-ssm-agent -register -code $SSM_ACTIVATION_CODE -id $SSM_ACTIVATION_ID -region $AWS_REGION
sudo service amazon-ssm-agent start
sudo reboot
