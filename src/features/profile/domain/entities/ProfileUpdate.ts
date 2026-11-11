import { Career } from "./UserProfile";

// Lo único que la persona puede editar de su perfil.
export type ProfileUpdate = {
  career: Career;
  bio: string;
  skills: string[];
};
