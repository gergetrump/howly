/**
 * Confirmation Dialog Component
 * 
 * Built on top of Radix UI's AlertDialog primitive.
 * This component provides an accessible, custom-styled modal dialog
 * specifically used for destructive actions (like deleting a habit) 
 * or important confirmations in the Howly app.
 */
import * as React from "react"
import { AlertDialog as ConfirmationDialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function ConfirmationDialog({
  ...props
}) {
  return <ConfirmationDialogPrimitive.Root data-slot="confirmation-dialog" {...props} />;
}

function ConfirmationDialogTrigger({
  ...props
}) {
  return (<ConfirmationDialogPrimitive.Trigger data-slot="confirmation-dialog-trigger" {...props} />);
}

function ConfirmationDialogPortal({
  ...props
}) {
  return (<ConfirmationDialogPrimitive.Portal data-slot="confirmation-dialog-portal" {...props} />);
}

function ConfirmationDialogOverlay({
  className,
  ...props
}) {
  return (
    <ConfirmationDialogPrimitive.Overlay
      data-slot="confirmation-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props} />
  );
}

function ConfirmationDialogContent({
  className,
  size = "default",
  ...props
}) {
  return (
    <ConfirmationDialogPortal>
      <ConfirmationDialogOverlay />
      <ConfirmationDialogPrimitive.Content
        data-slot="confirmation-dialog-content"
        data-size={size}
        className={cn(
          "group/confirmation-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl bg-theme-surface p-6 text-theme-text ring-1 ring-theme-text/10 shadow-2xl shadow-black/40 duration-100 outline-none data-[size=default]:sm:max-w-md data-[size=sm]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props} />
    </ConfirmationDialogPortal>
  );
}

function ConfirmationDialogHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="confirmation-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=confirmation-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=confirmation-dialog-media]:gap-x-4 sm:group-data-[size=default]/confirmation-dialog-content:place-items-start sm:group-data-[size=default]/confirmation-dialog-content:text-left sm:group-data-[size=default]/confirmation-dialog-content:has-data-[slot=confirmation-dialog-media]:grid-rows-[auto_1fr]",
        className
      )}
      {...props} />
  );
}

function ConfirmationDialogFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="confirmation-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 group-data-[size=sm]/confirmation-dialog-content:grid group-data-[size=sm]/confirmation-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props} />
  );
}

function ConfirmationDialogMedia({
  className,
  ...props
}) {
  return (
    <div
      data-slot="confirmation-dialog-media"
      className={cn(
        "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/confirmation-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
        className
      )}
      {...props} />
  );
}

function ConfirmationDialogTitle({
  className,
  ...props
}) {
  return (
    <ConfirmationDialogPrimitive.Title
      data-slot="confirmation-dialog-title"
      className={cn(
        "font-heading text-base font-medium sm:group-data-[size=default]/confirmation-dialog-content:group-has-data-[slot=confirmation-dialog-media]/confirmation-dialog-content:col-start-2",
        className
      )}
      {...props} />
  );
}

function ConfirmationDialogDescription({
  className,
  ...props
}) {
  return (
    <ConfirmationDialogPrimitive.Description
      data-slot="confirmation-dialog-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props} />
  );
}

function ConfirmationDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <Button variant={variant} size={size} asChild>
      <ConfirmationDialogPrimitive.Action data-slot="confirmation-dialog-action" className={cn(className)} {...props} />
    </Button>
  );
}

function ConfirmationDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}) {
  return (
    <Button variant={variant} size={size} asChild>
      <ConfirmationDialogPrimitive.Cancel data-slot="confirmation-dialog-cancel" className={cn(className)} {...props} />
    </Button>
  );
}

export {
  ConfirmationDialog,
  ConfirmationDialogAction,
  ConfirmationDialogCancel,
  ConfirmationDialogContent,
  ConfirmationDialogDescription,
  ConfirmationDialogFooter,
  ConfirmationDialogHeader,
  ConfirmationDialogMedia,
  ConfirmationDialogOverlay,
  ConfirmationDialogPortal,
  ConfirmationDialogTitle,
  ConfirmationDialogTrigger,
}
