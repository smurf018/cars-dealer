"use client";

import { toggleSavedCar } from "@/actions/list-cars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import useFetch from "@/hooks/use-fetch";
import { formatCurrency } from "@/lib/helper";
import { useAuth } from "@clerk/nextjs";
import {
  Calendar,
  Car,
  Currency,
  Fuel,
  Gauge,
  Heart,
  MessageSquare,
  Share2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import EmiCalculator from "./emi-calculator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CarDetails({ car, testDriveInfo }) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(car.wishlisted);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const {
    loading: savingCar,
    fn: toggleSavedCarFunction,
    data: toggleResult,
    error: toggleError,
  } = useFetch(toggleSavedCar);

  useEffect(() => {
    if (toggleResult?.success && toggleResult.saved !== isWishlisted) {
      setIsWishlisted(toggleResult.isWishlisted);
      toast.success(toggleResult.message);
    }
  }, [toggleResult, isWishlisted]);

  useEffect(() => {
    if (toggleError) {
      toast.error("Failed to update favorites");
    }
  }, [toggleError]);

  const handleSaveCar = async (e) => {
    if (!isSignedIn) {
      toast.error("Please signin to save cars");
      router.push("/sign-in");
      return;
    }

    if (savingCar) return;

    await toggleSavedCarFunction(car.id);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${car.year} ${car.make} ${car.model}`,
          text: `Check out this ${car.year} ${car.make} ${car.model} on CarZone!`,
          url: window.location.href,
        })
        .catch((error) => {
          console.log("Error while sharing", error);
          copyToClipboard();
        });
    } else {
      copyToClipboard();
    }
  };

  const handleBookTestDrive = () => {
    
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-7/12">
          <div className="aspect-video rounded-lg overflow-hidden relative mb-4">
            {car.images && car.images.length > 0 ? (
              <Image
                src={car.images[currentImageIndex]}
                alt={`${car.year} ${car.make} ${car.model}`}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Car className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>
          {/* this is only for multiple images (for a specific car) */}
          {car.images && car.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {car.images.map((img, idx) => {
                return (
                  <div
                    key={idx}
                    className={`relative cursor-pointer rounded-md h-20 w-24 flex-shrink-0 transition ${
                      idx === currentImageIndex
                        ? "border-2 border-blue-600"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    onClick={() => setCurrentImageIndex(idx)}
                  >
                    <Image
                      src={img}
                      alt={`${car.year} ${car.make} ${car.model} - view ${
                        idx + 1
                      }`}
                      fill
                      className="object-cover"
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex mt-4 gap-4">
            <Button
              variant="outline"
              className={`flex items-center gap-2 flex-1 cursor-pointer ${
                isWishlisted && "text-red-500"
              }`}
              onClick={handleSaveCar}
              disabled={savingCar}
            >
              <Heart className={`h-5 w-5 ${isWishlisted && "fill-red-500"}`} />
              {isWishlisted ? "Saved" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex items-center cursor-pointer gap-2 flex-1"
            >
              <Share2 className="w-5 h-5" />
              Share
            </Button>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Badge className="mb-2">{car.bodyType}</Badge>
          </div>
          <h1 className="text-4xl font-bold mb-1">
            {car.year} {car.make} {car.model}
          </h1>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(car.price)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-6">
            <div className="flex items-center gap-2">
              <Gauge className="text-gray-500 h-5 w-5" />
              <span>{car.mileage.toLocaleString()} miles</span>
            </div>
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-gray-500" />
              <span>{car.fuelType}</span>
            </div>
            <div className="flex items-center gap-2">
              <Car className="text-gray-500 h-5 w-5" />
              <span>{car.transmission}</span>
            </div>
          </div>
          {/* EMI calculator tab */}
          <Dialog>
            <DialogTrigger className="w-full text-start">
              <Card>
                <CardContent>
                  <div className="flex items-center gap-2 text-lg font-medium mb-2">
                    <Currency className="h-5 w-5 text-blue-600" />
                    <h3>EMI Calculator</h3>
                  </div>
                  <div className="text-sm text-gray-600">
                    Estimated Monthly Payment:{" "}
                    <span className="font-bold text-gray-900">
                      {formatCurrency(car.price / 60)}
                    </span>{" "}
                    for 60 months
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    *Based on $0 down payment and 4.5% interest rate
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>CarZone EMI Calculator</DialogTitle>
                <EmiCalculator price={car.price} />
              </DialogHeader>
            </DialogContent>
          </Dialog>

          {/* Request User Info */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-lg font-medium mb-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h3>Have Questions?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                We have representives to address all your queries about this
                car.
              </p>
              <a href="mailto:help@carzone.in">
                <Button variant="outline" className="w-full cursor-pointer">
                  Request Info
                </Button>
              </a>
            </CardContent>
          </Card>
          {(car.status === "SOLD" || car.status === "UNAVAILABLE") && (
            <Alert variant="destructive">
              <AlertTitle className="capitalize">
                This car is {car.status.toLowerCase()}
              </AlertTitle>
              <AlertDescription>Please check again later.</AlertDescription>
            </Alert>
          )}

          {car.status !== "SOLD" && car.status !== "UNAVAILABLE" && (
            <Button
              className="w-full py-6 text-lg cursor-pointer"
              disabled={testDriveInfo.userTestDrive}
              onClick={handleBookTestDrive}
            >
              <Calendar className="mr-2 h-5 w-5" />
              {testDriveInfo.userTestDrive
                ? `Booked for ${format(
                    new Date(testDriveInfo.userTestDrive.bookingDate),
                    "EEEE, MMMM d, yyyy"
                  )}`
                : "Book Test Drive"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
