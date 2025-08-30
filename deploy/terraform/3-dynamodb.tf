resource "aws_dynamodb_table" "analysis_results" {
    name = "${local.app}-${local.env}-analysis-results"
    billing_mode = "PROVISIONED"
    read_capacity= "10"
    write_capacity= "5"

    attribute {
        name = "age"
        type = "N"
    }

    attribute {
        name = "songKey"
        type = "S"
    }

    hash_key = "age"
    range_key = "songKey"
}

output "analysis_results_table_name" {
  description = "DynamoDB table name for analysis results"
  value       = aws_dynamodb_table.analysis_results.name
}