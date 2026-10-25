import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(100)
  name: string;

  // send the id of a parent category to make a sub-category
  @IsOptional()
  @IsUUID('all', { message: 'parentId must be a valid id' })
  parentId?: string | null;
}
