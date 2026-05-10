export interface ClusterResult {
  assignments: number[]     // cluster index per data point
  centroids: number[][]
  k: number
  iterations: number
  inertia: number
  labels: string[]
}

export interface ClusterPoint {
  customerId: string
  features: number[]
}

// Z-score normalization
export function normalizeFeatures(data: number[][]): { normalized: number[][]; means: number[]; stds: number[] } {
  if (data.length === 0) return { normalized: [], means: [], stds: [] }
  const dims = data[0].length
  const means = Array(dims).fill(0) as number[]
  const stds = Array(dims).fill(0) as number[]

  for (const row of data) {
    for (let d = 0; d < dims; d++) means[d] += row[d]
  }
  for (let d = 0; d < dims; d++) means[d] /= data.length

  for (const row of data) {
    for (let d = 0; d < dims; d++) stds[d] += (row[d] - means[d]) ** 2
  }
  for (let d = 0; d < dims; d++) stds[d] = Math.sqrt(stds[d] / data.length) || 1

  const normalized = data.map((row) => row.map((v, d) => (v - means[d]) / stds[d]))
  return { normalized, means, stds }
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2
  return Math.sqrt(sum)
}

function randomInit(data: number[][], k: number): number[][] {
  // K-means++ initialization
  const centroids: number[][] = []
  const n = data.length
  // Pick first centroid uniformly at random
  centroids.push([...data[Math.floor(Math.random() * n)]])

  for (let c = 1; c < k; c++) {
    const distances = data.map((point) => {
      const minDist = Math.min(...centroids.map((centroid) => euclideanDistance(point, centroid)))
      return minDist ** 2
    })
    const sum = distances.reduce((a, b) => a + b, 0)
    let rand = Math.random() * sum
    let chosen = 0
    for (let i = 0; i < n; i++) {
      rand -= distances[i]
      if (rand <= 0) { chosen = i; break }
    }
    centroids.push([...data[chosen]])
  }
  return centroids
}

export function clusterCustomers(features: number[][], k: number, maxIterations = 100): ClusterResult {
  if (features.length === 0) {
    return { assignments: [], centroids: [], k, iterations: 0, inertia: 0, labels: [] }
  }

  const { normalized } = normalizeFeatures(features)
  const n = normalized.length
  const dims = normalized[0].length

  let centroids = randomInit(normalized, k)
  let assignments = new Array(n).fill(0) as number[]
  let iterations = 0

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1

    // Assignment step
    const newAssignments = normalized.map((point) => {
      let minDist = Infinity
      let best = 0
      for (let c = 0; c < k; c++) {
        const d = euclideanDistance(point, centroids[c])
        if (d < minDist) { minDist = d; best = c }
      }
      return best
    })

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i])
    assignments = newAssignments
    if (!changed) break

    // Update step — recompute centroids
    const newCentroids = Array.from({ length: k }, () => new Array(dims).fill(0) as number[])
    const counts = new Array(k).fill(0) as number[]

    for (let i = 0; i < n; i++) {
      const c = assignments[i]
      counts[c]++
      for (let d = 0; d < dims; d++) newCentroids[c][d] += normalized[i][d]
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < dims; d++) newCentroids[c][d] /= counts[c]
      } else {
        // Empty cluster — reinitialize from a random point
        newCentroids[c] = [...normalized[Math.floor(Math.random() * n)]]
      }
    }
    centroids = newCentroids
  }

  // Compute inertia
  let inertia = 0
  for (let i = 0; i < n; i++) {
    inertia += euclideanDistance(normalized[i], centroids[assignments[i]]) ** 2
  }

  const labels = generateClusterLabels(centroids, features, assignments, k)
  return { assignments, centroids, k, iterations, inertia, labels }
}

export function suggestK(features: number[][], maxK = 8): number {
  if (features.length < 4) return Math.min(features.length, 2)

  const maxKActual = Math.min(maxK, Math.floor(features.length / 3))
  if (maxKActual < 2) return 2

  const inertias: number[] = []
  for (let k = 1; k <= maxKActual; k++) {
    const result = clusterCustomers(features, k, 50)
    inertias.push(result.inertia)
  }

  // Elbow method: find k where the rate of decrease slows the most
  let bestK = 2
  let maxCurvature = -Infinity

  for (let k = 1; k < inertias.length - 1; k++) {
    const prevDrop = inertias[k - 1] - inertias[k]
    const nextDrop = inertias[k] - inertias[k + 1]
    const curvature = prevDrop - nextDrop
    if (curvature > maxCurvature) {
      maxCurvature = curvature
      bestK = k + 1
    }
  }

  return bestK
}

function generateClusterLabels(
  centroids: number[][],
  originalFeatures: number[][],
  assignments: number[],
  k: number
): string[] {
  // Compute cluster stats from original (un-normalized) features
  const stats = Array.from({ length: k }, () => ({
    avgRevenue: 0,
    avgFrequency: 0,
    avgRecency: 0,
    count: 0,
  }))

  for (let i = 0; i < assignments.length; i++) {
    const c = assignments[i]
    const f = originalFeatures[i]
    stats[c].avgRevenue += (f[2] ?? 0)    // monetary dimension
    stats[c].avgFrequency += (f[1] ?? 0)  // frequency dimension
    stats[c].avgRecency += (f[0] ?? 0)    // recency dimension
    stats[c].count++
  }

  for (const s of stats) {
    if (s.count > 0) {
      s.avgRevenue /= s.count
      s.avgFrequency /= s.count
      s.avgRecency /= s.count
    }
  }

  const maxRevenue = Math.max(...stats.map((s) => s.avgRevenue), 1)
  const maxFrequency = Math.max(...stats.map((s) => s.avgFrequency), 1)

  return stats.map((s, i) => {
    const revPct = s.avgRevenue / maxRevenue
    const freqPct = s.avgFrequency / maxFrequency
    const recencyLow = s.avgRecency > 90

    if (revPct > 0.8 && freqPct > 0.6) return `High-Value (Cluster ${i + 1})`
    if (revPct > 0.5 && !recencyLow) return `Engaged (Cluster ${i + 1})`
    if (recencyLow && freqPct < 0.3) return `Churned (Cluster ${i + 1})`
    if (freqPct > 0.6 && revPct < 0.3) return `Frequent Low-Spend (Cluster ${i + 1})`
    if (s.avgRecency < 30) return `Recent (Cluster ${i + 1})`
    return `Standard (Cluster ${i + 1})`
  })
}
