import { ReactNode } from "react";
import "@testing-library/jest-dom";

interface TestWrapperProps {
  children: ReactNode;
}

export function TestWrapper({ children }: TestWrapperProps) {
  return <>{children}</>;
} 