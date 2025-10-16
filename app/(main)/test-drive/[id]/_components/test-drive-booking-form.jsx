"use client";

import { bookTestDrive } from "@/actions/test-drive";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useFetch from "@/hooks/use-fetch";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Car, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const testDriveSchema = z.object({
  date: z.date({
    required_error: "Please select a date for your test drive",
  }),
  timeSlot: z.string({
    required_error: "Please select a time slot",
  }),
  notes: z.string().optional(),
});

export default function TestDriveBookingForm({ car, testDriveInfo }) {
  const router = useRouter();
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(testDriveSchema),
    defaultValues: {
      date: undefined,
      timeSlot: undefined,
      notes: "",
    },
  });

  const {
    loading: bookingInProgress,
    fn: bookingTestDriveFunction,
    data: bookingResult,
    error: bookingError,
  } = useFetch(bookTestDrive);

  const dealership = testDriveInfo?.dealership;
  const existingBookings = testDriveInfo?.existingBookings || [];

  const selectedDate = watch("date");

  useEffect(() => {
    if (bookingError) {
      toast.error(
        bookingError.message || "Failed to book test drive. Please try again."
      );
    }
  }, [bookingError]);

  useEffect(() => {
    if (bookingResult?.success) {
      setBookingDetails({
        date: format(bookingResult?.data?.bookingDate, "EEEE, MMMM d, yyyy"),
        timeSlot: `${format(
          parseISO(`2022-01-01T${bookingResult?.data?.startTime}`),
          "h:mm a"
        )} - ${format(
          parseISO(`2022-01-01T${bookingResult?.data?.endTime}`),
          "h:mm a"
        )}`,
        notes: bookingResult?.data?.notes,
      });
      setShowConfirmation(true);

      reset();
    }
  }, [bookingResult]);

  const onSubmit = async (data) => {
    const selectedSlot = availableTimeSlots.find(
      (slot) => slot.id === data.timeSlot
    );

    if (!selectedSlot) {
      toast.error("Selected time slot is not available");
      return;
    }

    await bookingTestDriveFunction({
      carId: car.id,
      bookingDate: format(data.date, "yyyy-MM-dd"),
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      notes: data.notes || "",
    });
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    router.push(`/cars/${car.id}`);
  };

  // function to disable previous dates in the calendar
  const isDayDisabled = (day) => {
    if (day < new Date()) return true;

    const dayOfWeek = format(day, "EEEE").toUpperCase();
    const daySchedule = dealership?.workingHours?.find(
      (schedule) => schedule.dayOfWeek === dayOfWeek
    );

    return !daySchedule || !daySchedule.isOpen;
  };

  useEffect(() => {
    if (!selectedDate || !dealership?.workingHours) return;

    const selectedDayOfWeek = format(selectedDate, "EEEE").toUpperCase();
    const daySchedule = dealership.workingHours.find(
      (day) => day.dayOfWeek === selectedDayOfWeek
    );

    if (!daySchedule || !daySchedule.isOpen) {
      setAvailableTimeSlots([]);
      return;
    }

    // generate time-slots
    const openHour = parseInt(daySchedule.openTime.split(":")[0]);
    const closeHour = parseInt(daySchedule.closeTime.split(":")[0]);
    const timeSlots = [];

    for (let hr = openHour; hr < closeHour; ++hr) {
      const startTime = `${hr.toString().padStart(2, "0")}:00`;
      const endTime = `${(hr + 1).toString().padStart(2, "0")}:00`;

      // to check if the slot is lready booked or not
      const isBooked = existingBookings.some((booking) => {
        const bookingDate = booking.date;
        return (
          bookingDate === format(selectedDate, "yyyy-MM-dd") &&
          (booking.startTime === startTime || booking.endTime === endTime)
        );
      });

      if (!isBooked) {
        timeSlots.push({
          id: `${startTime} - ${endTime}`,
          label: `${startTime} - ${endTime}`,
          startTime,
          endTime,
        });
      }
    }

    setAvailableTimeSlots(timeSlots);
    setValue("timeSlot", "");
  }, [selectedDate]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Car Details</h2>
            <div className="aspect-video rounded-lg overflow-hidden relative mb-4">
              {car.images && car.images.length > 0 ? (
                <img
                  src={car.images[0]}
                  alt={`${car.year} ${car.make} ${car.model}`}
                  className="objcet-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Car className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <h3 className="text-lg font-bold">
              {car.year} {car.make} {car.model}
            </h3>
            <div className="mt-2 text-xl font-bold text-blue-600">
              Rs. {car.price.toLocaleString()}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <div className="flex justify-between py-1 border-b">
                <span>Mileage</span>
                <span className="font-medium">
                  {car.mileage.toLocaleString()} miles
                </span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Fuel Type</span>
                <span className="font-medium">{car.fuelType}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Transission</span>
                <span className="font-medium">{car.transmission} miles</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Body Type</span>
                <span className="font-medium">{car.bodyType}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Color</span>
                <span className="font-medium">{car.color}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Dealership Info</h2>
            <div className="text-sm">
              <p className="font-medium">{dealership?.name || "CarZone"}</p>
              <p className="text-gray-600 mt-1">
                {dealership?.address || "Address not available"}
              </p>
              <p className="text-gray-600 mt-3">
                <span className="font-medium">Phone : </span>
                {dealership?.phone || "Not Available"}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Email : </span>
                {dealership?.email || "Not Available"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardContent>
            <h2 className="text-xl font-bold mb-6">Schedule Your Test Drive</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Select a Date
                </label>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => {
                    return (
                      <div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal cursor-pointer",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              disabled={isDayDisabled}
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.date && (
                          <p className="text-sm font-medium text-red-500 mt-1">
                            {errors.date.message}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm block font-medium">
                  Select a Time Slot
                </label>
                <Controller
                  name="timeSlot"
                  control={control}
                  render={({ field }) => {
                    return (
                      <div>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={
                            !selectedDate || availableTimeSlots.length === 0
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue
                              placeholder={
                                !selectedDate
                                  ? "Please select a date first"
                                  : availableTimeSlots.length === 0
                                  ? "No available slots on this date"
                                  : "Select a time slot"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTimeSlots.map((slot) => (
                              <SelectItem key={slot.id} value={slot.id}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.date && (
                          <p className="text-sm font-medium text-red-500 mt-1">
                            {errors.date.message}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="block text-sm font-medium">
                  Additional Notes (Optional)
                </label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => {
                    return (
                      <Textarea
                        {...field}
                        placeholder="Any specific question or requests for your test drive?"
                        className="min-h-24"
                      />
                    );
                  }}
                />
              </div>
              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={bookingInProgress}
              >
                {bookingInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking your test drive...
                  </>
                ) : (
                  "Book Test Drive"
                )}
              </Button>
            </form>
            <div className="mt-8 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">What to expect</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  Bring your driver's license for verification
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  Test drives typically last 30-60 minutes
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  A dealership representative will accompany you
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
          {bookingDetails && (
            <div className="py-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Car:</span>
                  <span>
                    {car.year} {car.make} {car.model}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{bookingDetails.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Time Slot:</span>
                  <span>{bookingDetails.timeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Delaership:</span>
                  <span>{dealership?.name || "CarZone"}</span>
                </div>
              </div>
              <div className="mt-4 bg-blue-50 p-3 rounded text-sm text-blue-700">
                Please arrive 20 minutes early with your driving license.
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              className="cursor-pointer"
              onClick={handleCloseConfirmation}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
