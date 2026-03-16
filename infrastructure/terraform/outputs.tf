output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "ecr_repository_urls" {
  value = {
    for key, repo in aws_ecr_repository.service_repo : key => repo.repository_url
  }
}

