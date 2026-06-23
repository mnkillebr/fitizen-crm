import { MemoryRouter, Route, Routes } from "react-router"

import Home from "~/routes/home"
import SignIn from "~/routes/sign-in"

type TestAppProps = {
  initialEntry?: string
}

export function TestApp({ initialEntry = "/" }: TestAppProps) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sign-in" element={<SignIn />} />
      </Routes>
    </MemoryRouter>
  )
}
