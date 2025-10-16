export default function ReservationList({ initialData }) {
  const upcomingBookings = initialData?.data?.filter((booking) =>
    ["PENDING", "CONFIRMED"].includes(booking.status)
  );
  const pastBookings = initialData?.data?.filter((booking) =>
    ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(booking.status)
  );
  return <div>Reservation List</div>;
}
