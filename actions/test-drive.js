"use server";

import { serializedCarData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function bookTestDrive({
  carId,
  bookingDate,
  startTime,
  endTime,
  notes,
}) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("You must be logged in to book a test drive");
    }
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });
    if (!user) {
      throw new Error("User not found in the database");
    }

    const car = await db.car.findUnique({
      where: {
        id: carId,
        status: "AVAILABLE",
      },
    });

    if (!car) {
      throw new Error("Car not available for the test drive");
    }

    const existingBooking = await db.testDriveBooking.findFirst({
      where: {
        carId,
        bookingDate: new Date(bookingDate),
        startTime,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
    });

    if (existingBooking) {
      throw new Error(
        "This time slot is already booked. Please select another time"
      );
    }

    const booking = await db.testDriveBooking.create({
      data: {
        carId,
        userId: user.id,
        bookingDate: new Date(bookingDate),
        startTime,
        endTime,
        notes: notes || null,
        status: "PENDING",
      },
    });

    revalidatePath(`/test-drive/${carId}`);
    revalidatePath(`/cars/${carId}`);

    return {
      success: true,
      data: booking,
    };
  } catch (error) {
    console.error("Error booking test drive: ", error);
    return {
      success: false,
      error: error.message || "Failed to book test drive",
    };
  }
}

export async function getUserTestDrives() {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("You must be logged in to book a test drive");
    }
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found in the database");
    }

    const bookings = await db.testDriveBooking.findMany({
      where: {
        userId: user.id,
      },
      include: {
        car: true,
      },
      orderBy: {
        bookingDate: "desc",
      },
    });

    const formatBookings = bookings.map((bkngs) => {
      return {
        id: bkngs.id,
        carId: bkngs.carId,
        car: serializedCarData(bkngs.car),
        bookingDate: bkngs.bookingDate.toISOString(),
        startTime: bkngs.startTime,
        endTime: bkngs.endTime,
        status: bkngs.status,
        notes: bkngs.notes,
        createdAt: bkngs.createdAt.toISOString(),
        updatedAt: bkngs.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      data: formatBookings,
    };
  } catch (error) {
    console.error("Error fetching test drives:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function cancelTestDrive(bookingId) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get the user from our database
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Get the booking
    const booking = await db.testDriveBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    // Check if user owns this booking
    if (booking.userId !== user.id || user.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized to cancel this booking",
      };
    }

    // Check if booking can be cancelled
    if (booking.status === "CANCELLED") {
      return {
        success: false,
        error: "Booking is already cancelled",
      };
    }

    if (booking.status === "COMPLETED") {
      return {
        success: false,
        error: "Cannot cancel a completed booking",
      };
    }

    // Update the booking status
    await db.testDriveBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    // Revalidate paths
    revalidatePath("/reservations");
    revalidatePath("/admin/test-drives");

    return {
      success: true,
      message: "Test drive cancelled successfully",
    };
  } catch (error) {
    console.error("Error cancelling test drive:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
