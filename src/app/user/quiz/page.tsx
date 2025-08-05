"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  Clock, 
  BookOpen, 
  Target,
  Calendar,
  Play,
  Filter
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DifficultyLevel, QuizStatus } from "@prisma/client"

interface Quiz {
  id: string
  title: string
  description?: string
  timeLimit?: number
  difficulty: DifficultyLevel
  status: QuizStatus
  startTime?: string
  endTime?: string
  _count: {
    quizQuestions: number
  }
  maxAttempts?: number | null
  userAttemptCount?: number
  userAttempt?: {
    id: string
    status: string
    score?: number
    submittedAt?: string
  }
}

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")

  useEffect(() => {
    fetchQuizzes()
  }, [])

  const fetchQuizzes = async () => {
    try {
      const response = await fetch("/api/user/quiz")
      if (response.ok) {
        const data = await response.json()
        setQuizzes(data)
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = async (quizId: string) => {
    try {
      const response = await fetch(`/api/user/quiz/${quizId}/start`, {
        method: "POST"
      })

      if (response.ok) {
        const data = await response.json()
        const quiz = quizzes.find(q => q.id === quizId)
        if (quiz) {
          toasts.quizStarted(quiz.title)
        }
        window.location.href = `/user/quiz/${quizId}/take`
      } else {
        const error = await response.json()
        toasts.actionFailed("Quiz start", error.message)
      }
    } catch (error) {
      toasts.actionFailed("Quiz start")
    }
  }

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDifficulty = difficultyFilter === "all" || quiz.difficulty === difficultyFilter

    return matchesSearch && matchesDifficulty
  })



  const getQuizStatus = (quiz: Quiz) => {
    if (quiz.userAttempt) {
      if (quiz.userAttempt.status === "SUBMITTED") {
        return { text: "Completed", variant: "default" as const }
      } else if (quiz.userAttempt.status === "IN_PROGRESS") {
        return { text: "In Progress", variant: "secondary" as const }
      }
    }

    // Check if quiz is available based on time constraints
    const now = new Date()
    if (quiz.startTime && new Date(quiz.startTime) > now) {
      // Check if within 30 minutes of start time
      const startTimePlus30 = new Date(quiz.startTime);
      startTimePlus30.setMinutes(startTimePlus30.getMinutes() + 30);
      if (now > startTimePlus30) {
        return { text: "Expired", variant: "destructive" as const };
      }
      return { text: "Upcoming", variant: "outline" as const }
    }
    if (quiz.endTime && new Date(quiz.endTime) < now) {
      return { text: "Expired", variant: "destructive" as const }
    }

    // Check for max attempts (only if not unlimited/infinite)
    if (quiz.maxAttempts !== null && quiz.maxAttempts !== undefined && 
        quiz.userAttemptCount !== undefined && quiz.userAttemptCount >= quiz.maxAttempts) {
      return { text: "Max Attempts Reached", variant: "destructive" as const }
    }

    return { text: "Available", variant: "default" as const }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Available Quizzes</h1>
        <p className="text-muted-foreground">
          Choose a quiz to test your knowledge
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                  <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>


          </div>
        </CardContent>
      </Card>

      {/* Quiz Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredQuizzes.map((quiz) => {
          const status = getQuizStatus(quiz)
          const canStart = status.text !== "Expired" && status.text !== "Upcoming" && status.text !== "Max Attempts Reached"

          return (
            <Card key={quiz.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    {quiz.description && (
                      <CardDescription className="mt-1">
                        {quiz.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={status.variant}>
                    {status.text}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <p className="text-sm text-muted-foreground">
                      {quiz._count.quizQuestions} questions • {quiz.userAttemptCount ?? 0} / {quiz.maxAttempts === null ? '∞' : quiz.maxAttempts} attempts
                    </p>
                  </div>

                  <Badge variant={
                    quiz.difficulty === DifficultyLevel.EASY ? "default" :
                    quiz.difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"
                  }>
                    {quiz.difficulty}
                  </Badge>
                </div>

                {quiz.timeLimit && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {quiz.timeLimit}m
                  </div>
                )}

                {quiz.userAttempt?.score !== undefined && (
                  <div className="text-sm">
                    <span className="font-medium">Your Score: </span>
                    {quiz.userAttempt.score} points
                  </div>
                )}

                {quiz.startTime && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Available from {new Date(quiz.startTime).toLocaleDateString()}
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={() => startQuiz(quiz.id)}
                  disabled={!canStart}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {status.text === "In Progress" ? "Continue Quiz" : "Start Quiz"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredQuizzes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No quizzes found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or check back later for new quizzes
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}