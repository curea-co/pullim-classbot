import * as React from "react";
import { Flex, type FlexProps } from "./flex";

/**
 * Stack — vertical Flex shorthand. The single most common layout need.
 *
 *   <Stack gap={4}>...</Stack>  ≡  <Flex direction="column" gap={4}>...</Flex>
 */
export type StackProps = Omit<FlexProps, "direction">;

export const Stack = React.forwardRef<HTMLDivElement, StackProps>((props, ref) => (
  <Flex ref={ref} direction="column" {...props} />
));
Stack.displayName = "Stack";
