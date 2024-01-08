#!/usr/bin/groovy
@Library('jenkins-pipeline-library@master')
import com.zailab.*

def notifier = new NotificationsEmitter()
def npm = new Npm()
def node = new Node()
def docker = new Docker()
def deployment = new Deployment()
def git = new Git()

def registryHost = "gitlab.zailab.com"
def registryPort = 5005
def registryNamespace = "communication"
def projectName = "sip-phone"
def imageRepository = "${registryHost}:${registryPort}/${registryNamespace}/${projectName}"
def version
def imageTag

try {
  nodejs10Node {
    stage('clone code') {
      checkout scm
    }

    stage('load config') {
      version = node.getVersion()
      projectName = node.getName()
      imageTag = "${imageRepository}:${version}"
    }

    stage('install npm dependencies') {
      npm.addKeys()
      container(name: 'nodejs') {
        sh "npm install"
      }
    }

    stage('build javascript') {
      container(name: 'nodejs') {
        sh "npm run build:prod"
      }
    }

    stage('build docker image') {
      docker.build(imageTag)
      git.tagVersion(version)
      docker.push(imageTag)
    }

    stage('generate deployment resources') {
      def config = [projectVersion  : version,
                    imageRepository : "${imageRepository}"]

      manifests.recursiveGenerate('src/main/deploy/kustomize', config)

      stash includes: 'src/main/deploy/kustomize/**', name: 'kustomize-stash'
    }
  }


  deployment.deployService(
    stacks : [stacks.api()],
    kustomizePath : 'src/main/deploy/kustomize',
    stashName: 'kustomize-stash',
    versioningConfig : ['projectName' : projectName, 'projectVersion' : version]
  )


} catch (e) {
  notifier.sendEmailNotification("FAILED")
  throw e
}
