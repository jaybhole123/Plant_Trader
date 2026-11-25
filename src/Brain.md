# Plant Daily Reports: Notes

File: `Plant_Daily_Reports.html` (single HTML file, works in the browser)

## Updates done

### History (All Plants) page
- **Search box:** search by plant name or date (e.g. `Nandan`, `25-Nov`).
- **Plant dropdown:** All plants, or any one of the 6 plants.
- **From / To date fields:** pill-style fields with a calendar icon. Clicking anywhere on the field opens the calendar, for both start and end date.
- **Clear button:** resets search, plant and dates.
- **Count:** shows "Showing X of Y reports".
- All filters work together. Search and date filters also work in each plant's own History tab.

### MIS Dashboard
- Profit & Loss was tried and then **reverted**. The dashboard is as it was before.

## Why Profit / Loss cannot be calculated

> The reports hold only **quantity (MT)**, not **rates or expenses (₹)**. Profit/Loss needs sale rate, purchase rate and expenses. Without that data, a correct profit/loss cannot be calculated.

Short version:

> Data me MT hai, ₹ nahi. Bina rate ke profit/loss nahi nikalta.

| Available in reports | Not available |
|---|---|
| Production (MT) | Sale rate (₹/MT) |
| Incoming (MT) | Purchase rate (₹/MT) |
| Outgoing (MT) | Power, labour, maintenance costs |
| Stock, Pending (MT) | |

Formula: `Profit / Loss = (Sold qty × Sale rate) − (Purchased qty × Purchase rate) − Expenses`

To enable it later, the rates and expenses must be entered (or uploaded) into the system.

## Important note about data

Saved reports live in the **browser storage** (localStorage / IndexedDB). If the HTML file is opened in a different browser or on a different computer, the old data will not appear. Use the same browser to keep the data.