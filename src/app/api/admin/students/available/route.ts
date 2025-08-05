import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get("quizId")

    if (!quizId) {
      return NextResponse.json(
        { message: "Quiz ID is required" },
        { status: 400 }
      )
    }

    // Get students who are NOT enrolled in this quiz
    const enrolledStudentIds = await db.quizAttempt.findMany({
      where: { quizId },
      select: { userId: true }
    })

    const enrolledIds = enrolledStudentIds.map(attempt => attempt.userId)

    // Build the where clause dynamically
    const whereClause: any = {
      role: UserRole.USER
    }

    // Only add notIn filter if there are enrolled students
    if (enrolledIds.length > 0) {
      whereClause.id = {
        notIn: enrolledIds
      }
    }

    const availableStudents = await db.user.findMany({
      where: whereClause,
      orderBy: { name: "asc" }
    })

    const formattedStudents = availableStudents.map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
      enrolled: false
    }))

    return NextResponse.json(formattedStudents)
  } catch (error) {
    console.error("Error fetching available students:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}