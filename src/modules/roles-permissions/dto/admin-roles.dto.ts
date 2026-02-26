import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsUUID, IsBoolean, IsEnum } from 'class-validator';

export class PermissionDto {
    @ApiPropertyOptional() @IsOptional() @IsUUID() featureId?: string;
    @ApiPropertyOptional() @IsOptional() @IsUUID() screenId?: string;
    @ApiProperty() @IsUUID() actionId: string;
}

export class CreateAdminRoleDto {
    @ApiProperty() @IsString() name: string;
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isSystem?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsString() targetUserType?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() slug?: string;
    @ApiProperty({ type: [PermissionDto] }) @IsOptional() @IsArray() initialPermissions?: PermissionDto[];
}

export class UpdateAdminRoleDto {
    @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isSystem?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsString() targetUserType?: string;
}

export class GrantAdminPermissionsDto {
    @ApiProperty() @IsUUID() roleId: string;
    @ApiProperty({ type: [PermissionDto] }) @IsArray() permissions: PermissionDto[];
}

