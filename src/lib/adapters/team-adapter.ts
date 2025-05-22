/**
 * Team Adapter - No longer needed as the database model has been renamed from Organization to Team
 * This file is kept for backward compatibility with existing code.
 */

// Identity function - returns the same object as is
export function organizationToTeam<T extends Record<string, any>>(team: T): T {
  return team;
}

// Identity function - returns the same object as is
export function teamToOrganization<T extends Record<string, any>>(team: T): T {
  return team;
}

// Identity function - returns the same array as is
export function organizationsToTeams<T extends Record<string, any>>(
  teams: T[]
): T[] {
  return teams;
}

// Utility function for renaming fields - kept for backward compatibility
export function renameField<T extends Record<string, any>>(
  obj: T,
  oldKey: string,
  newKey: string
): Record<string, any> {
  if (!obj) return obj;

  const { [oldKey]: value, ...rest } = obj;
  return {
    ...rest,
    [newKey]: value,
  };
}
