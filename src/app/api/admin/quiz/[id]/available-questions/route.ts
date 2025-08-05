import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get questions that are not already in this quiz
    const existingQuestionIds = await db.quizQuestion.findMany({
      where: { quizId: id },
      select: { questionId: true }
    })

    const existingIds = existingQuestionIds.map(qq => qq.questionId)

    const availableQuestions = await db.question.findMany({
      where: {
        id: {
          notIn: existingIds.length > 0 ? existingIds : ["nonexistent"]
        },
        isActive: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(availableQuestions)
  } catch (error) {
    console.error("Error fetching available questions:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}