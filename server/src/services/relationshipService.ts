import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateRelationshipDTO {
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
  relationshipType?: string
  sourceCardinality?: string
  targetCardinality?: string
  onUpdate?: string
  onDelete?: string
  name?: string
}

export interface UpdateRelationshipDTO {
  name?: string
  relationshipType?: string
  sourceCardinality?: string
  targetCardinality?: string
  onUpdate?: string
  onDelete?: string
}

export const relationshipService = {
  async findByProjectId(projectId: string) {
    return await prisma.relationship.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })
  },

  async findById(id: string) {
    return await prisma.relationship.findUnique({
      where: { id }
    })
  },

  async create(projectId: string, data: CreateRelationshipDTO) {
    return await prisma.relationship.create({
      data: {
        projectId,
        sourceTableId: data.sourceTableId,
        sourceColumnId: data.sourceColumnId,
        targetTableId: data.targetTableId,
        targetColumnId: data.targetColumnId,
        relationshipType: data.relationshipType || 'ONE_TO_MANY',
        sourceCardinality: data.sourceCardinality || '1',
        targetCardinality: data.targetCardinality || 'N',
        onUpdate: data.onUpdate || 'CASCADE',
        onDelete: data.onDelete || 'CASCADE',
        name: data.name
      }
    })
  },

  async update(id: string, data: UpdateRelationshipDTO) {
    return await prisma.relationship.update({
      where: { id },
      data: {
        name: data.name,
        relationshipType: data.relationshipType,
        sourceCardinality: data.sourceCardinality,
        targetCardinality: data.targetCardinality,
        onUpdate: data.onUpdate,
        onDelete: data.onDelete
      }
    })
  },

  async delete(id: string) {
    return await prisma.relationship.delete({
      where: { id }
    })
  }
}
