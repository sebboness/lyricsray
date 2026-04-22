// components/SupportCard.tsx
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  useTheme,
} from "@mui/material";

export const KO_FI_LINK = "https://ko-fi.com/sebboness";

type Variant = "inline" | "result" | "full";

interface SupportCardProps {
  variant?: Variant;
}

export const SupportCard: React.FC<SupportCardProps> = ({
  variant = "inline",
}) => {
  const theme = useTheme();

  const isCompact = variant === "inline";

  return (
    <Card
      elevation={variant === "result" ? 3 : 1}
      sx={{
        mt: 3,
        borderRadius: 3,
        backgroundColor:
          variant === "result"
            ? theme.palette.background.paper
            : theme.palette.background.default,
      }}
    >
      <CardContent>
        <Stack spacing={isCompact ? 1 : 2} alignItems="center">
          <Typography
            variant={isCompact ? "body2" : "h6"}
            align="center"
          >
            ☕ Help keep this free for parents
          </Typography>

          {!isCompact && (
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
            >
              If this lyrics analysis helped you make a decision, consider supporting the project and covering some of
              the development and hosting costs ❤️
            </Typography>
          )}

          <Button
            variant="contained"
            color="primary"
            href={KO_FI_LINK}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textTransform: "none",
              borderRadius: 2,
            }}
          >
            Support on Ko-fi
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};