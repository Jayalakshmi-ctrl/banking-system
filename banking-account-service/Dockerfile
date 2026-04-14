FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN apt-get update && apt-get install -y --no-install-recommends maven && rm -rf /var/lib/apt/lists/*
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache wget
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /app/target/banking-account-service-*.jar /app/app.jar
USER app
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8002/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
