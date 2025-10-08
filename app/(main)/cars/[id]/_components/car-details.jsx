"use client";

import { toggleSavedCar } from "@/actions/list-cars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/use-fetch";
import { formatCurrency } from "@/lib/helper";
import { useAuth } from "@clerk/nextjs";
import { Car, Fuel, Gauge, Heart, Share2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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
        </div>
      </div>
    </div>
  );
}
