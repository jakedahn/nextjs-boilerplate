import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { Toaster, toast } from "@/components/ui/toast"

describe("Toaster", () => {
  it("shows a toast added through the toast manager", async () => {
    const user = userEvent.setup()
    const handleClick = () => {
      toast.add({ title: "Saved" })
    }
    render(
      <Toaster>
        <button type="button" onClick={handleClick}>
          Save
        </button>
      </Toaster>
    )

    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Saved")).toBeInTheDocument()
  })
})
