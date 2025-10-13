import { getCarById } from "@/actions/list-cars";
import { notFound } from "next/navigation";
import TestDriveBookingForm from "./_components/test-drive-booking-form";

export async function generateMetaData() {
  return {
    title: `Book Test Drive | CarZone`,
    description: `Schedule a test drive in seconds`,
  };
}

export default async function TestDrivePage({ params }) {
  const { id } = await params;
  const result = await getCarById(id);

  if (!result.success) {
    notFound();
  }
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-6xl mb-6 gradient-title">Book a Test Drive</h1>
      <TestDriveBookingForm
        car={result.data}
        testDriveInfo={result?.data?.testDriveInfo}
      />
    </div>
  );
}
