const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== 检查数据库中的项目 ===')
  const projects = await prisma.project.findMany({
    include: {
      projectMembers: true
    }
  })
  
  console.log(`\n共找到 ${projects.length} 个项目:`)
  projects.forEach(project => {
    console.log(`\n项目ID: ${project.id}`)
    console.log(`项目名称: ${project.name}`)
    console.log(`创建者: ${project.createdBy}`)
    console.log(`项目成员数量: ${project.projectMembers.length}`)
    if (project.projectMembers.length > 0) {
      console.log('项目成员:')
      project.projectMembers.forEach(member => {
        console.log(`  - 用户ID: ${member.userId}, 角色: ${member.role}`)
      })
    }
  })

  console.log('\n=== 检查用户 ===')
  const users = await prisma.user.findMany()
  console.log(`\n共找到 ${users.length} 个用户:`)
  users.forEach(user => {
    console.log(`\n用户ID: ${user.id}`)
    console.log(`用户名: ${user.username}`)
    console.log(`邮箱: ${user.email}`)
  })

  await prisma.$disconnect()
}

main().catch(console.error)