# Team Migration Guide

## Pengantar

Aplikasi ini saat ini menggunakan dua istilah yang berbeda untuk entitas yang sama: "organization" di database dan "team" di UI. Hal ini membuat kode menjadi kurang konsisten dan lebih sulit dipahami.

Untuk mengatasi masalah ini, kami telah membuat **Team Adapter** yang menjembatani perbedaan terminologi ini. Pada tahap development, ini adalah solusi yang lebih aman dibandingkan mengubah seluruh skema database.

## Arsitektur

### Komponen-komponen Utama

1. **Team Adapter**

   - Lokasi: `src/lib/adapters/team-adapter.ts`
   - Fungsi-fungsi utilitas untuk mengubah antara istilah "organization" dan "team".

2. **Team Hooks**

   - Lokasi: `src/lib/hooks/use-teams.ts`
   - Hooks React untuk mengakses dan memanipulasi data team.

3. **Team Context**

   - Lokasi: `src/lib/contexts/team-context.tsx`
   - Context untuk mempertahankan state team saat ini dan menyediakannya ke seluruh aplikasi.

4. **Team Selector**
   - Lokasi: `src/components/TeamSelector.tsx`
   - Komponen UI untuk memilih dan beralih antara team.

## Cara Penggunaan

### 1. Mengakses Data Team

```tsx
import { useTeams, useTeam } from "@/lib/hooks/use-teams";

// Untuk mendapatkan semua team
function TeamsList() {
  const { teams, isLoading } = useTeams();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {teams.map((team) => (
        <li key={team.teamId}>{team.name}</li>
      ))}
    </ul>
  );
}

// Untuk mendapatkan satu team berdasarkan ID
function TeamDetails({ teamId }) {
  const { team, isLoading } = useTeam(teamId);

  if (isLoading) return <div>Loading...</div>;
  if (!team) return <div>Team not found</div>;

  return <div>Team Name: {team.name}</div>;
}
```

### 2. Mengakses Team Saat Ini

```tsx
import { useTeamContext } from "@/lib/contexts/team-context";

function CurrentTeamInfo() {
  const { currentTeamId, setCurrentTeamId } = useTeamContext();

  return (
    <div>
      <div>Current Team ID: {currentTeamId}</div>
      <button onClick={() => setCurrentTeamId("some-other-team-id")}>
        Switch Team
      </button>
    </div>
  );
}
```

### 3. Menggunakan Team Selector

```tsx
import { TeamSelector } from "@/components/TeamSelector";
import { useTeamContext } from "@/lib/contexts/team-context";

function Header() {
  const { currentTeamId, setCurrentTeamId } = useTeamContext();

  return (
    <header>
      <h1>My App</h1>
      <TeamSelector
        currentTeamId={currentTeamId}
        onTeamChange={setCurrentTeamId}
      />
    </header>
  );
}
```

### 4. Untuk Kode Legacy yang Masih Menggunakan Organization

Untuk kode yang masih menggunakan istilah "organization", Anda masih dapat menggunakan `useOrganization` hook, yang telah diperbarui untuk menggunakan Team Context di balik layar.

```tsx
import { useOrganization } from "@/contexts/organization-context";

function LegacyComponent() {
  const { selectedOrganization, organizations } = useOrganization();

  // Kode ini akan tetap berfungsi
  return <div>Current Organization: {selectedOrganization?.name}</div>;
}
```

## Rencana Jangka Panjang

Di masa depan, kami berencana untuk mengubah seluruh skema database dan kode untuk konsisten menggunakan istilah "team". Adapter ini adalah solusi sementara untuk memungkinkan transisi bertahap.

- [ ] Selesaikan migrasi UI ke terminologi "team"
- [ ] Buat migrasi database untuk mengubah nama tabel dan kolom
- [ ] Hilangkan komponen adapter setelah migrasi selesai
