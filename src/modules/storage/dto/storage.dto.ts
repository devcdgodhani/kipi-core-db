import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';

export class CreateDirectoryDto {
  @ApiProperty({ example: 'case-documents', description: 'Directory name' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_\-\s]+$/, {
    message: 'Directory name can only contain letters, numbers, hyphens, underscores, and spaces',
  })
  name: string;

  @ApiPropertyOptional({ example: 'root', description: 'Parent directory path (omit for root)' })
  @IsOptional()
  @IsString()
  parentPath?: string;
}

export class ListFilesQueryDto {
  @ApiPropertyOptional({ example: '', description: 'Directory path to list (empty for root)' })
  @IsOptional()
  @IsString()
  path?: string;
}

export class MoveFileDto {
  @ApiProperty({ example: 'file-id-uuid', description: 'ID of the file to move' })
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @ApiProperty({ example: 'new/directory/path', description: 'Target directory path' })
  @IsString()
  targetDirPath: string;
}

export class CopyFileDto {
  @ApiProperty({ example: 'file-id-uuid', description: 'ID of the file to copy' })
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @ApiProperty({ example: 'destination/directory/path', description: 'Destination directory path' })
  @IsString()
  targetDirPath: string;
}

export class DeleteFileDto {
  @ApiProperty({ example: 'file-id-uuid', description: 'ID of the file to delete' })
  @IsString()
  @IsNotEmpty()
  fileId: string;
}
