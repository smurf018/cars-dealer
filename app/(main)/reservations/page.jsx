import { getUserTestDrives } from "@/actions/test-drive";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ReservationList from "./_components/reservation-lits";

export const metadata = {
  title: "My Reservations | CarZone",
  description: "Manage your test drive reservations",
};

export default async function ReservationPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect=/reservations");
  }

  const reservationResult = await getUserTestDrives();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-6xl mb-6 gradient-title">Your Reservations</h1>
      <ReservationList initialData={reservationResult} />
    </div>
  );
}
