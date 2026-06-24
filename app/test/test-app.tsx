import { createMemoryRouter, RouterProvider } from "react-router"

import Home from "~/routes/home"
import SignIn, { action as signInAction } from "~/routes/sign-in"

type TestAppProps = {
  initialEntry?: string
}

export function TestApp({ initialEntry = "/" }: TestAppProps) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <Home /> },
      {
        path: "/sign-in",
        element: <SignIn />,
        action: signInAction,
      },
    ],
    { initialEntries: [initialEntry] }
  )

  return <RouterProvider router={router} />
}
