"use client";

import { useState } from "react";
import {
  Settings,
  Globe,
  CreditCard,
  Mail,
  Bell,
  Shield,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface SettingsData {
  general: {
    siteName: string;
    siteDescription: string;
    supportEmail: string;
    supportPhone: string;
    timezone: string;
    currency: string;
  };
  booking: {
    maxPassengersPerBooking: number;
    bookingExpirationMinutes: number;
    allowGuestBooking: boolean;
    requireIdVerification: boolean;
  };
  payment: {
    provider: string;
    enableSandbox: boolean;
    minimumAmount: number;
    taxPercentage: number;
  };
  notifications: {
    sendBookingConfirmation: boolean;
    sendPaymentReceipt: boolean;
    sendDepartureReminder: boolean;
    reminderHoursBefore: number;
  };
}

const defaultSettings: SettingsData = {
  general: {
    siteName: "SpeedBoat Ticket",
    siteDescription: "Book speedboat tickets to beautiful Indonesian islands",
    supportEmail: "support@speedboatticket.com",
    supportPhone: "+62 812 3456 7890",
    timezone: "Asia/Jakarta",
    currency: "IDR",
  },
  booking: {
    maxPassengersPerBooking: 10,
    bookingExpirationMinutes: 30,
    allowGuestBooking: false,
    requireIdVerification: true,
  },
  payment: {
    provider: "midtrans",
    enableSandbox: true,
    minimumAmount: 50000,
    taxPercentage: 11,
  },
  notifications: {
    sendBookingConfirmation: true,
    sendPaymentReceipt: true,
    sendDepartureReminder: true,
    reminderHoursBefore: 24,
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({ title: "Settings saved successfully" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = <K extends keyof SettingsData>(
    category: K,
    field: keyof SettingsData[K],
    value: SettingsData[K][keyof SettingsData[K]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage system configuration</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Note: This is a demo settings page. In a production environment, these settings would be stored in a database and applied system-wide.
        </AlertDescription>
      </Alert>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Booking</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payment</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic site information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={settings.general.siteName}
                    onChange={(e) => updateSettings("general", "siteName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.general.timezone}
                    onValueChange={(v) => updateSettings("general", "timezone", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                      <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                      <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.general.siteDescription}
                  onChange={(e) => updateSettings("general", "siteDescription", e.target.value)}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => updateSettings("general", "supportEmail", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input
                    id="supportPhone"
                    value={settings.general.supportPhone}
                    onChange={(e) => updateSettings("general", "supportPhone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={settings.general.currency}
                  onValueChange={(v) => updateSettings("general", "currency", v)}
                >
                  <SelectTrigger className="w-full sm:w-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">Indonesian Rupiah (IDR)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    <SelectItem value="SGD">Singapore Dollar (SGD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Settings */}
        <TabsContent value="booking">
          <Card>
            <CardHeader>
              <CardTitle>Booking Settings</CardTitle>
              <CardDescription>Configure booking rules and restrictions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxPassengers">Max Passengers per Booking</Label>
                  <Input
                    id="maxPassengers"
                    type="number"
                    min={1}
                    max={50}
                    value={settings.booking.maxPassengersPerBooking}
                    onChange={(e) =>
                      updateSettings("booking", "maxPassengersPerBooking", parseInt(e.target.value) || 1)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of passengers allowed in a single booking
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiration">Booking Expiration (minutes)</Label>
                  <Input
                    id="expiration"
                    type="number"
                    min={5}
                    max={120}
                    value={settings.booking.bookingExpirationMinutes}
                    onChange={(e) =>
                      updateSettings("booking", "bookingExpirationMinutes", parseInt(e.target.value) || 30)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Time before unpaid booking expires
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Guest Booking</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to book without creating an account
                    </p>
                  </div>
                  <Switch
                    checked={settings.booking.allowGuestBooking}
                    onCheckedChange={(checked: boolean) => updateSettings("booking", "allowGuestBooking", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require ID Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Require valid ID number for all passengers
                    </p>
                  </div>
                  <Switch
                    checked={settings.booking.requireIdVerification}
                    onCheckedChange={(checked: boolean) =>
                      updateSettings("booking", "requireIdVerification", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure payment gateway and options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="provider">Payment Provider</Label>
                  <Select
                    value={settings.payment.provider}
                    onValueChange={(v) => updateSettings("payment", "provider", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="midtrans">Midtrans</SelectItem>
                      <SelectItem value="xendit">Xendit</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumAmount">Minimum Amount (IDR)</Label>
                  <Input
                    id="minimumAmount"
                    type="number"
                    min={0}
                    value={settings.payment.minimumAmount}
                    onChange={(e) =>
                      updateSettings("payment", "minimumAmount", parseInt(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
                <Input
                  id="taxPercentage"
                  type="number"
                  min={0}
                  max={100}
                  value={settings.payment.taxPercentage}
                  onChange={(e) =>
                    updateSettings("payment", "taxPercentage", parseInt(e.target.value) || 0)
                  }
                  className="w-full sm:w-50"
                />
                <p className="text-xs text-muted-foreground">
                  Tax rate applied to all transactions
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sandbox Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use test/sandbox environment for payment processing
                  </p>
                </div>
                <Switch
                  checked={settings.payment.enableSandbox}
                  onCheckedChange={(checked: boolean) => updateSettings("payment", "enableSandbox", checked)}
                />
              </div>

              {settings.payment.enableSandbox && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sandbox mode is enabled. No real transactions will be processed.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure email and notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Booking Confirmation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send email when booking is confirmed
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sendBookingConfirmation}
                    onCheckedChange={(checked: boolean) =>
                      updateSettings("notifications", "sendBookingConfirmation", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      Payment Receipt
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send email receipt after successful payment
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sendPaymentReceipt}
                    onCheckedChange={(checked: boolean) =>
                      updateSettings("notifications", "sendPaymentReceipt", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-yellow-500" />
                      Departure Reminder
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminder before scheduled departure
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sendDepartureReminder}
                    onCheckedChange={(checked: boolean) =>
                      updateSettings("notifications", "sendDepartureReminder", checked)
                    }
                  />
                </div>

                {settings.notifications.sendDepartureReminder && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="reminderHours">Reminder Time</Label>
                    <Select
                      value={String(settings.notifications.reminderHoursBefore)}
                      onValueChange={(v) =>
                        updateSettings("notifications", "reminderHoursBefore", parseInt(v))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 hours before</SelectItem>
                        <SelectItem value="12">12 hours before</SelectItem>
                        <SelectItem value="24">24 hours before</SelectItem>
                        <SelectItem value="48">48 hours before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
