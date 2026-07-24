resource "aws_dynamodb_table" "analysis_results" {
    name = "${local.app}-${local.env}-analysis-results"
    billing_mode = "PAY_PER_REQUEST"

    attribute {
        name = "songKey"
        type = "S"
    }

    attribute {
      name = "entityType"
      type = "S"
    }

    attribute {
      name = "date"
      type = "S"
    }

    hash_key = "songKey"
    
    # Global Secondary Index for querying recent analyses
    global_secondary_index {
      name            = "RecentAnalysesIndex"
      hash_key        = "entityType"
      range_key       = "date"
      projection_type = "ALL"
    }
}

resource "aws_dynamodb_table" "analysis_rate_limits" {
    name = "${local.app}-${local.env}-analysis-rate-limits"
    billing_mode = "PAY_PER_REQUEST"

    attribute {
        name = "id"
        type = "S"
    }

    hash_key = "id"
}