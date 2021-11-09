# Containers @ Edge example project for k3s, Raspberry Pi, AWS IoT Greengrass, and AWS Systems Manager

This example project demonstrates how to collect data from edge locations using Kubernetes (k3s) and AWS IoT Greengrass.

In this documentation, we'll cover how to

* Set up the infrastructure using [AWS Cloud Development Kit](https://github.com/awslabs/aws-cdk)
* Bootstrapping the Raspberry Pi
* Deploy AWS IoT Greengrass to the edge device using kubectl

The infrastructure is set up using AWS CDK and implemented with TypeScript.

## Prerequisites

For this installaion, you should have the following prerequisites:

* An AWS account
* A properly installed and configured AWS CDK
* An environment to deploy the AWS CDK application (AWS Cloud9 is highly recommended)
* A Rapsberry Pi 4 with a correctly configured AWS CLI

## Packaging the application as container image

The application is already packaged in a container image and can be found here. However, if you still want to build the container image yourself, it is important to run the build for ARM. This can be done directly on the Raspberry Pi, on your local workstation using `docker buildx` or in AWS using AWS CodeBuild (a blog post describing this approach can be found [here](https://aws.amazon.com/de/blogs/devops/build-arm-based-applications-using-codebuild/)).

Under `docker` there is a Dockerfile called `Dockerfile-arm` which can be build using:

```
$ cd k3s-greengrass/docker
$ docker buildx build --platform linux/arm/v7 -f Dockerfile-arm -t <repo/image:tag> .
$ docker push <repo/image:tag>
```

## Set up the infrastructure using AWS CDK

After we've built and pushed the Docker image containing OpenJDK 11 and AWS IoT Greengrass, we need to set up the basic infrastructure:

```
$ npm install -g aws-cdk
$ npm install
$ cdk deploy  // Deploys the CloudFormation template
```

## Bootstrapping the Raspberry Pi

After the CDK application has run succesfully and the necessary infrastructure is up an running, you have to set up the Raspberry Pi using bash-scripts from the Git-repository. Under `k3s-greengrass/device/bootstrapping` you can find two scripts `bootstrap.sh`  and `install_k3s.sh`.

```
$ cd k3s-greengrass/device/bootstrapping
$ sudo ./bootstrap.sh
```

Now you've to reboot the device to apply cgroup-changes.

```
$ cd k3s-greengrass/device/bootstrapping
$ sudo ./install_k3s.sh
```

## Deploying AWS IoT to k3s

Now the k3s-cluster is up and running and you can deploy AWS IoT Greengrass to kubernetes with `k3s-greengrass/deployment/greengrass-v2-deployment.yaml` using the following commands:

```
$ export KUBECONFIG=~/.kube/kubeconfig-k3s
$ kubectl apply -f k3s-greengrass/deployment/greengrass-v2-deployment.yaml
```

## Contributing
Please create a new GitHub issue for any feature requests, bugs, or documentation improvements.

Where possible, please also submit a pull request for the change.