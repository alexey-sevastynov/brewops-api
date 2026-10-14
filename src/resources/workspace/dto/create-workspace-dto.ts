import { IsNotEmpty, IsString, Length } from "class-validator";

export class CreateWorkspaceDto {
    @IsNotEmpty()
    @IsString()
    @Length(1, 100)
    name!: string;
}
