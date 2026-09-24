import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Questionnaire,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"

describe("Questionnaire", () => {
  it("renders the question title and its choices", () => {
    render(
      <Questionnaire>
        <QuestionnaireItem name="color">
          <QuestionnaireTitle>Favorite color?</QuestionnaireTitle>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="red">Red</QuestionnaireChoice>
            <QuestionnaireChoice value="blue">Blue</QuestionnaireChoice>
          </QuestionnaireChoices>
        </QuestionnaireItem>
      </Questionnaire>
    )

    expect(screen.getByText("Favorite color?")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Red" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Blue" })).toBeInTheDocument()
  })
})
