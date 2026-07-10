import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
    if (!category) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return category;
  }

  async create(dto: CreateCategoryDto) {
    await this.assertSlugAvailable(dto.slug);
    if (dto.parentId) await this.findOne(dto.parentId);
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    if (dto.slug) await this.assertSlugAvailable(dto.slug, id);
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Una categoría no puede ser su propia subcategoría');
      }
      await this.findOne(dto.parentId);
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.category.delete({ where: { id } });
    } catch {
      // onDelete: Restrict en Product.category — hay productos usando esta categoría.
      throw new ConflictException('No se puede eliminar: hay productos asignados a esta categoría');
    }
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Ya existe una categoría con slug "${slug}"`);
    }
  }
}
