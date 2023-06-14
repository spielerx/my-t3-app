import type { User } from "next-auth";

export const filterUserForClient = ({ id, name, email, image }: User) => ({
  id,
  name,
  email,
  image,
});
