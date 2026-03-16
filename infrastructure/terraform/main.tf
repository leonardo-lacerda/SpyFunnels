terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.13"

  name = "${var.project_name}-vpc"
  cidr = "10.40.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.40.1.0/24", "10.40.2.0/24", "10.40.3.0/24"]
  public_subnets  = ["10.40.101.0/24", "10.40.102.0/24", "10.40.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.31"

  cluster_name    = "${var.project_name}-eks"
  cluster_version = "1.31"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      instance_types = ["m6i.large"]
      min_size       = 3
      max_size       = 10
      desired_size   = 4
    }
    browser_workers = {
      instance_types = ["m6i.xlarge"]
      min_size       = 2
      max_size       = 20
      desired_size   = 4
      labels = {
        workload = "browser"
      }
    }
  }
}

locals {
  ecr_repositories = [
    "funnel-api",
    "funnel-web",
    "funnel-crawler",
    "funnel-browser-automation",
    "funnel-stack-detection",
    "funnel-email-intelligence",
    "funnel-ad-intelligence",
    "funnel-funnel-analysis",
    "funnel-monitoring-engine"
  ]
}

resource "aws_ecr_repository" "service_repo" {
  for_each = toset(local.ecr_repositories)

  name                 = "${var.project_name}/${each.key}"
  image_tag_mutability = "MUTABLE"
}

