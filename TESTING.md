# Manual End-to-End Testing Checklist

Follow these steps in order. Use fresh users where noted.

## Admin Flow
1. Login as admin.
2. Go to Manage Organizers and create a new organizer; copy generated credentials.
3. Verify admin dashboard stats update (total/active organizers).

## Organizer Flow
1. Login with the new organizer credentials.
2. On first login, change the forced password.
3. Update organizer profile (optional Discord webhook URL).
4. Create an event with custom form fields and (optionally) merchandise variants.
5. Publish the event; confirm Discord webhook receives the publish notification.

## Participant Flow
1. Sign up as participant (use @iiit.ac.in if IIIT flag is selected) and complete onboarding.
2. Browse events: use search, filters, followed-only, and observe trending section.
3. Open event detail, fill custom form, and register (or purchase merchandise).
4. Confirm registration succeeds and email arrives containing event name, date/time, ticket ID, and embedded QR image.

## Organizer Verification
1. Open the event detail (organizer view).
2. Check participants tab: search and filter by payment/attendance.
3. Export CSV and verify file downloads with participant rows.

## Password Reset Flow
1. As organizer, submit a password reset request with a reason.
2. As admin, approve the request; note the new password.
3. Organizer logs in using the new password and is prompted to change it.

## Participant Dashboard Tabs
1. As participant, open My Events and switch across Upcoming, Completed, Cancelled/Rejected, and Merchandise tabs; verify data loads and empty states render.

## Event Lifecycle
1. Create events with start/end dates straddling current time; fetch listings to confirm status auto-updates to Published/Ongoing/Completed.

## Error Handling & Validation
1. Attempt invalid inputs (short passwords, missing required fields, over stock/limits) and verify 400 responses with clear messages and UI errors.
