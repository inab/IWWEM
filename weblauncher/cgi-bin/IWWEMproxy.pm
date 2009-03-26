#!/usr/bin/perl -W

# $Id$
# IWWEMproxy.pm
# from INB Interactive Web Workflow Enactor & Manager (IWWE&M)
# Author: José María Fernández González (C) 2007-2008
# Institutions:
# *	Spanish National Cancer Research Institute (CNIO, http://www.cnio.es/)
# *	Spanish National Bioinformatics Institute (INB, http://www.inab.org/)
#
# This file is part of IWWE&M, the Interactive Web Workflow Enactor & Manager.
# 
# IWWE&M is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# IWWE&M is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
# 
# You should have received a copy of the GNU Affero General Public License
# along with IWWE&M.  If not, see <http://www.gnu.org/licenses/agpl.txt>.
# 
# Original IWWE&M concept, design and coding done by JosÃ© MarÃ­a FernÃ¡ndez GonzÃ¡lez, INB (C) 2008.
# Source code of IWWE&M is available at http://trac.bioinfo.cnio.es/trac/iwwem

use strict;

package IWWEMproxy;

use Encode;
use FindBin;
use CGI;
use MIME::Base64;
use XML::LibXML;
#use File::Path;
use LWP::UserAgent;

use lib "$FindBin::Bin";
use IWWEM::Config;
use IWWEM::WorkflowCommon;
use IWWEM::Taverna1WorkflowKind;
use IWWEM::InternalWorkflowList::Constants;
use IWWEM::InternalWorkflowList;
use BaclavaSAX;

use lib "$FindBin::Bin/LockNLog";
use LockNLog;

# Function prototypes
sub parseExpression($);
sub applyExpression($$;$);

sub doAnswer($$$\@;$);
sub rawAnswer($$\@;$);

sub parseBaclavaQuery($$$$$$$$$$);
sub doBaclavaQuery($$$\@$$$$$$$$$$$$$);
sub processBaclavaQuery($$$$$$$$$$$$);


# Function bodies

sub parseExpression($) {
	my($theDOM)=@_;
	my(%expression)=();
	
	if($theDOM->hasAttribute('encoding') && $theDOM->getAttribute('encoding') eq 'base64') {
		$expression{'base64'}=undef;
	}
	
	if($theDOM->hasAttribute('dontExtract') && $theDOM->getAttribute('dontExtract') eq 'true') {
		$expression{'dontExtract'} = undef;
	}
	
	foreach my $child ($theDOM->childNodes()) {
		if($child->nodeType==XML::LibXML::XML_ELEMENT_NODE) {
			my($exptype)=$child->localName();
			if($exptype eq 'xpath') {
				$expression{'xpath'}=$child->getAttribute('expression');
				my($nsMapping)={};
				foreach my $ns ($child->childNodes()) {
					if($ns->nodeType==XML::LibXML::XML_ELEMENT_NODE && $ns->localName() eq 'nsMapping') {
						$nsMapping->{$ns->getAttribute('prefix')}=$ns->getAttribute('ns');
					}
				}
				$expression{'nsMapping'}=$nsMapping;
			} elsif($exptype eq 'reExpression') {
				my($pa)=$child->textContent();
				$expression{'RE'} = (!defined($pa))?'':$pa;
			}
		}
	}
	
	return \%expression;
}

sub applyExpression($$;$) {
	my($expression,$data,$numres)=@_;
	
	$numres=0  unless(defined($numres));
	
	my(@res)=();
	my($retval)=undef;
	
	if(defined($data)) {
		if(exists($expression->{'RE'})) {
			if(defined($expression->{'RE'})  && $expression->{'RE'} ne '') {
				$data=$data->textContent()  if(ref($data));
				@res = $data =~ /$expression->{'RE'}/g;
			} else {
				push(@res,$data);
			}
		} else {
			my($context)=XML::LibXML::XPathContext->new();
			my($prefix,$ns);
			while(($prefix,$ns)=each(%{$expression->{'nsMapping'}})) {
				$context->registerNs($prefix,$ns);
			}
			unless(ref($data)) {
				my($parser)=XML::LibXML->new();
				eval {
					$data=$parser->parse_string($data);
				};
				if($@) {
					$data=undef;
				}
			}
			
			if(defined($data)) {
				@res=$context->findnodes($expression->{'xpath'},$data);
			}
		}
	}
	
	if($numres<scalar(@res)) {
		$retval=exists($expression->{'dontExtract'})?$data:$res[$numres];
		if(exists($expression->{'base64'})) {
			$retval=$retval->textContent()  if(ref($retval));
			$retval=decode_base64($retval);
		}
	}
	
	return $retval;
}

sub doAnswer($$$\@;$) {
	my($query,$content,$fromFile,$p_headerPars,$withName)=@_;
	
	if(defined($fromFile)) {
		push(@{$p_headerPars}, -Last_Modified => scalar(gmtime((stat($fromFile))[9])));
	} else {
		push(@{$p_headerPars},-expires=>'+10s');
	}
	if(defined($withName)) {
		push(@{$p_headerPars}, -attachment=>$withName);
	}
	
	push(@{$p_headerPars}, -Content_Length=>((ref($content) eq 'GLOB')?(stat($content))[7]:length($content)));
	
	print $query->header(@{$p_headerPars});
	
	if(ref($content) eq 'GLOB') {
		my($buffer);
		while(read($content,$buffer,65536)) {
			print $buffer;
		}
	} else {
		print $content;
	}
}

sub rawAnswer($$\@;$) {
	my($query,$fromFile,$p_headerPars,$asMime)=@_;

	unless(defined($fromFile)) {
		# 404
		print $query->header(-status=> '404 Not Found'),
			$query->start_html('IWWEMfs message'),
			$query->h2('Request not processed because real file for virtual path does not exist');
	}
	
	if(index($fromFile,'http://')==0 || index($fromFile,'https://')==0 || index($fromFile,'ftp://')==0) {
		# Proxy work
		my $ua = LWP::UserAgent->new();
		$ua->agent("IWWEM/0.7 ");
		my($first)=1;
		my($resp)=$ua->get($fromFile, ':content_cb' => sub {
			my($chunk,$respint,$proto)=@_;
			
			if(defined($first)) {
				# Headers here
				$first=undef;
				
				my(@headers)=();
				push(@headers,@{$p_headerPars})  if(defined($p_headerPars) && ref($p_headerPars) eq 'ARRAY');
				
				# Transferring relevant headers
				for my $header (('Date','Content-Length','Content-Type','Content-Transfer-Encoding','Last-Modified','Expires','Cache-Control')) {
					push(@headers,'-'.$header => $respint->header($header))  if(defined($respint->header($header)));
				}
				
				print $query->header(@headers);
			}
			
			print $chunk;
		}
		);
		unless($resp->is_success) {
			print $query->header(-status=> $resp->status_line),
				$query->start_html('IWWEMfs message'),
				$query->h2('Request not processed because virtual path is unreachable');
		}
	} else {
		my($FH);
		if(open($FH,'<',$fromFile)) {
			unless(defined($asMime)) {
				my($varpos)=rindex($fromFile,'/');
				if($varpos!=-1) {
					my($basename)=substr($fromFile,$varpos+1);
					my($dotpos)=rindex($basename,'.');
					if($dotpos!=-1) {
						my($ext)=substr($basename,$dotpos+1);
						my($MIMEFILE);
						if(open($MIMEFILE,'<',$IWWEM::WorkflowCommon::ETCDIR . '/mime.types')) {
							my(@mimelines)=<$MIMEFILE>;
							close($MIMEFILE);
							my(@greplines)=grep(/^[-\w]+\/[-.+\w]+[ \t]+.*[ \t]$ext/,@mimelines);
							if(scalar(@greplines)>0) {
								$asMime=$greplines[0];
								chomp($asMime);
								if(defined($asMime) && length($asMime)>0) {
									$asMime =~ s/[ \t].*$//;
								}
							}
						}
					}
				}
				$asMime='application/octet-stream'  unless(defined($asMime));
			}
			my(@headerPars)=(-type=>$asMime);
			push(@headerPars,@{$p_headerPars})  if(defined($p_headerPars) && ref($p_headerPars) eq 'ARRAY');
			doAnswer($query,$FH,$fromFile,@headerPars);
			close($FH);
		} else {
			# 404
			print $query->header(-status=> '404 Not Found'),
				$query->start_html('IWWEMfs message'),
				$query->h2('Request not processed because real file for virtual path does not exist');
		}
	}
}

sub parseBaclavaQuery($$$$$$$$$$) {
	my($query,$retval,$origJobId,$asMime,$step,$iteration,$IOMode,$IOPath,$bundle64,$withName)=@_;
	
	# Second, parameter parsing
	my($bacio)=undef;
	my(@path)=();
	my($facet)=undef;
	my($isExample)=undef;
	my($jobId)=$origJobId;
	my($aFile)=undef;
	if($retval eq '0' && !$query->cgi_error() && (defined($IOPath) || defined($IOMode)) && defined($jobId)) {
		# Time to know the overall status of this enaction
		my($jobdir)=undef;
		my($wfsnap)=undef;
		
		if(index($jobId,$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX)==0) {
			if(index($jobId,'/')==-1 && $jobId =~ /^$IWWEM::InternalWorkflowList::Constants::SNAPSHOTPREFIX([^:]+):([^:]+)$/) {
				$wfsnap=$1;
				$jobId=$2;
				$jobdir=$IWWEM::Config::WORKFLOWDIR .'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::SNAPSHOTSDIR.'/'.$jobId;
			}
		} elsif(index($jobId,$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX)==0) {
			if(index($jobId,'/')==-1 && $jobId =~ /^$IWWEM::InternalWorkflowList::Constants::EXAMPLEPREFIX([^:]+):([^:]+)$/) {
				$wfsnap=$1;
				$jobId=$2;
				$jobdir=$IWWEM::Config::WORKFLOWDIR .'/'.$wfsnap.'/'.$IWWEM::WorkflowCommon::EXAMPLESDIR;
				$isExample=1;
			}
		} else {
			# For completion, we handle qualified job Ids
			$jobId =~ s/^$IWWEM::InternalWorkflowList::Constants::ENACTIONPREFIX//;
			$jobdir=$IWWEM::Config::JOBDIR . '/' .$jobId;
		}
		
		# Is it a valid job id?
		if(index($jobId,'/')==-1 && defined($jobdir) && -d $jobdir && -r $jobdir) {
			if(defined($IOPath) || defined($IOMode) || (defined($asMime) && $asMime =~ /^[^ \/\n\t]+\/[^ \/\n\t]+/)) {
				if(defined($bundle64)) {
					$retval=-1  unless(!defined($withName) || index($withName,'/')==-1);
				} else {
					my($targfile)=undef;
					if(defined($isExample)) {
						$aFile=$jobId.'.xml';
						$targfile=[$jobId.'.xml'];
					} elsif(defined($IOMode) && $IOMode ne 'B') {
						if($IOMode eq 'I') {
							$aFile=$IWWEM::WorkflowCommon::INPUTSFILE;
							$targfile=[$aFile];
						} elsif($IOMode eq 'O') {
							$aFile=$IWWEM::WorkflowCommon::OUTPUTSFILE;
							$targfile=[$aFile];
						}
					} elsif(!defined($IOPath) && (!defined($IOMode) || $IOMode eq 'B')) {
						$aFile=$IWWEM::WorkflowCommon::OUTPUTSFILE;
						$targfile=[$IWWEM::WorkflowCommon::INPUTSFILE,$aFile];
					}
					
					if(defined($targfile)) {
						# The pseudo XPath IOPath
						if(defined($IOPath) && length($IOPath)>0) {
							@path=split(/\//,$IOPath);
						}
						if(!defined($IOPath) || length($IOPath)==0 || scalar(@path)>0) {
							if(defined($withName) && length($withName)==0) {
								$withName=join('_',@path);
								$withName =~ s/\[([^\]]+)\]/-$1/g;
							}
							$facet=shift(@path) if(scalar(@path)>0);
							
							# Now, the physical path
							my($stepdir)=$jobdir;
							if(!defined($isExample) && defined($step) && length($step)>0 && $step ne $origJobId) {
								$stepdir .= '/'.$IWWEM::WorkflowCommon::RESULTSDIR.'/'.$step;
							} else {
								$step='';
								# Forcing iteration forgery avoidance
								$iteration=undef;
							}
	
							if(index($step,'/')==-1 && -d $stepdir && -r $stepdir) {
								my($iterdir)=$stepdir;
								if(defined($iteration) && length($iteration)>0) {
									$iterdir .= '/Iterations/'.$iteration;
								} else {
									$iteration='';
								}
	
								if(defined($iteration) && index($iteration,'/')==-1 && -d $iterdir && -r $iterdir) {
									my(@Abacarray)=();
									my($lastval)=undef;
									my($parser)=XML::LibXML->new();
									foreach my $parttargfile (@{$targfile}) {
										my($partbacfile)=$iterdir . '/' . $parttargfile;
		
										# We are going to parse!
										#$context->registerNs('s',$IWWEM::WorkflowCommon::SCUFL_NS);
		
										eval {
											if(defined($IOPath) && length($IOPath)>0) {
												$lastval=$parser->parse_file($partbacfile);
											} else {
												$lastval=$partbacfile;
											}
											push(@Abacarray,[($parttargfile eq $IWWEM::WorkflowCommon::OUTPUTSFILE)?'O':'I',$lastval]);
										};
		
										if($@) {
											$retval="8, $@";
											last;
										}
									}
									# Qualifying aFile
									$aFile = $iterdir . '/' . $aFile  if(defined($aFile));
									$bacio=(scalar(@Abacarray)==1)?$lastval:\@Abacarray;
								} else {
									$retval=7;
								}
							} else {
								$retval=6;
							}
						} else {
							$retval=5;
						}
					} else {
						$retval=4;
					}
				}
			} else {
				$retval=3;
			}
		} else {
			$retval=2;
		}
	} else {
		$retval=1;
	}
	
	return ($retval,$jobId,\@path,$facet,$bacio,$isExample,$aFile);
}

sub doBaclavaQuery($$$\@$$$$$$$$$$$$$) {
	my($query,$origJobId,$jobId,$p_path,$facet,$bacio,$isExample,$aFile,$asMime,$step,$iteration,$IOMode,$IOPath,$bundle64,$withName,$charset,$raw)=@_;
	my(@path)=@{$p_path};
	my($dec)=undef;

	if(defined($IOPath) && length($IOPath)>0) {
		my($retmesg)=undef;
		
		# Now it is time to work!
		my($pathi)=undef;
		unless(defined($bundle64)) {
			eval {
				my($context)=XML::LibXML::XPathContext->new();
				$context->registerNs('b',$IWWEM::WorkflowCommon::BACLAVA_NS);
				$context->registerNs('s',IWWEM::Taverna1WorkflowKind->getRootNS());
				
				my(%xpathvars)=();
				my($varbase)='var';
				my($varnum)=0;
				my($transfacet)=IWWEM::WorkflowCommon::depatchPath($facet);
				my($varref)=$varbase.$varnum;
				$varnum++;
				$xpathvars{$varref}=$transfacet;
				
				my($xpathfetch)="/b:dataThingMap/b:dataThing[\@key=\$$varref]/b:myGridDataDocument/";
				my($mimefetch)=$xpathfetch."s:metadata/s:mimeTypes/s:mimeType[1]";
	
				my($pathlength)=scalar(@path);
				for($pathi=$pathlength-1;$pathi>=0;$pathi--) {
					if(index($path[$pathi],'#')==0) {
						last;
					}
				}
				my($effpathlength)=($pathi>=0)?$pathi:$pathlength;
				if($effpathlength>0) {
					$xpathfetch .= 'b:partialOrder/b:itemList/';
					$effpathlength--;
					for(my $pathidx=0; $pathidx<$effpathlength; $pathidx++) {
						my($transpath)=IWWEM::WorkflowCommon::depatchPath($path[$pathidx]);
						my($varref)=$varbase.$varnum;
						$varnum++;
						$xpathvars{$varref}=$transpath;
						$xpathfetch .= "b:partialOrder[\@index=\$$varref]/b:itemList/";
					}
					my($transpath)=IWWEM::WorkflowCommon::depatchPath($path[$effpathlength]);
					my($varref)=$varbase.$varnum;
					$varnum++;
					$xpathvars{$varref}=$transpath;
					$xpathfetch .= "b:dataElement[\@index=\$$varref]";
				} else {
					$xpathfetch .= 'b:dataElement';
				}
	
				# Last step
				$xpathfetch .= '/b:dataElementData';
				my($callback)=sub($$$) {
					my($p_xpathvars,$name,$uri)=@_;
					
					return exists($p_xpathvars->{$name})?$p_xpathvars->{$name}:undef;
				};
				my(@mimenode)=();
				$context->registerVarLookupFunc($callback,\%xpathvars);
				my(@datanodes)=$context->findnodes($xpathfetch,$bacio);
				@mimenode=$context->findnodes($mimefetch,$bacio)  unless(defined($asMime));
				$context->unregisterVarLookupFunc($callback);
					
				if(scalar(@datanodes)!=0) {
					$bundle64=$datanodes[0]->textContent();
				} else {
					$retmesg="XPath $xpathfetch not found";
				}
				
				if(!defined($asMime) && scalar(@mimenode)>0) {
					$asMime=$mimenode[0]->textContent();
				}
			};
	
			if($@) {
				if(defined($retmesg)) {
					$retmesg .= "\n".$@;
				} else {
					$retmesg=$@;
				}
			}
		}
	
		# We must signal here late errors
		if(defined($retmesg)) {
			print $query->header(-status=> '404 Not Found'),
				$query->start_html('IWWEMproxy Problems'),
				$query->h2('Request not processed because '.$retmesg);
			return;
		}
	
		# And now, decoding
		$dec=decode_base64($bundle64);
	
		# Do we have to do further processing?
		if($pathi!=-1) {
			# We are going to parse!
			my($parser)=XML::LibXML->new();
			my($context)=XML::LibXML::XPathContext->new();
			$context->registerNs('pat',$IWWEM::WorkflowCommon::PAT_NS);
			#$context->registerNs('s',$IWWEM::WorkflowCommon::SCUFL_NS);
	
			my($docpat);
			eval {
				$docpat=$parser->parse_file($IWWEM::WorkflowCommon::PATTERNSFILE);
			};
			unless($@) {
				my($varref)='var0';
				my(%xpathvars)=();
				my($callback)=sub($$$) {
					my($p_xpathvars,$name,$uri)=@_;
	
					return exists($p_xpathvars->{$name})?$p_xpathvars->{$name}:undef;
				};
				$context->registerVarLookupFunc($callback,\%xpathvars);
				my($pathlength)=scalar(@path);
				for(;$pathi<$pathlength;$pathi++) {
					if($path[$pathi] =~ /^#([^\[\]]+)\[([0-9]+)\]$/) {
						my($patternName)=$1;
						my($match)=$2;
	
						unless(ref($dec)) {
							eval {
								$dec=$parser->parse_string($dec);
							};
	
							if($@) {
								last;
								$dec=undef;
							}
						}
						
						$xpathvars{$varref}=$patternName;
						my(@patnodes)=$context->findnodes("//pat:detectionPattern[\@name=\$$varref]",$docpat);
						last  if(scalar(@patnodes)!=1);
	
						my($expression)=undef;
						my($extractStep)=undef;
	
						foreach my $expr ($patnodes[0]->childNodes()) {
							if($expr->nodeType==XML::LibXML::XML_ELEMENT_NODE) {
								my($tagname)=$expr->localName();
								if(!defined($expression) && $tagname eq 'expression') {
									$expression=parseExpression($expr);
								} elsif(!defined($extractStep) && $tagname eq 'extractionStep') {
									$extractStep=parseExpression($expr);
								}
							}
						}
	
						last  unless(defined($expression) && defined($extractStep));
						my($matched)=applyExpression($expression,$dec,$match);
						$dec=applyExpression($extractStep,$matched);
						last  unless(defined($dec));
					} else {
						last;
					}
				}
	
				$dec=$dec->textContent()  if(ref($dec));
				$context->unregisterVarLookupFunc($callback);
			}
		}
	} elsif(defined($bundle64)) {
		print $query->header(-status=> '404 Not Found'),
			$query->start_html('IWWEMproxy Problems'),
			$query->h2('Request not processed because outputs listing cannot be got from a Base64 bundle');
		return;
	} elsif(defined($raw)) {
		my(@headers)=();
		rawAnswer($query,$aFile,@headers);
		return;
	} else {
		# Generating output listing
		my $outputDoc = XML::LibXML::Document->createDocument('1.0','UTF-8');
		my($root)=$outputDoc->createElementNS($IWWEM::WorkflowCommon::WFD_NS,'dataBundle');
		$root->setAttribute('time',LockNLog::getPrintableNow());
		$root->setAttribute('uuid',$origJobId);
		unless(defined($isExample)) {
			$root->setAttribute('flow',(defined($IOMode) && $IOMode ne 'B')?(($IOMode eq 'I')?'Inputs':'Outputs'):'Both');
			$root->setAttribute('step',$step)  if(defined($step) && length($step)>0);
			$root->setAttribute('iteration',$iteration)  if(defined($iteration) && length($iteration)>0);
		}
		$root->appendChild($outputDoc->createComment($IWWEM::WorkflowCommon::COMMENTWM));
		$outputDoc->setDocumentElement($root);
		
		# TODO
		my($p_bacio)=undef;
		if(ref($bacio) ne 'ARRAY') {
			$p_bacio=[[$IOMode,$bacio]];
		} else {
			$p_bacio=$bacio;
		}
		my($miniIOMode,$minibacio);
		foreach my $mini (@{$p_bacio}) {
			($miniIOMode,$minibacio)=@{$mini};
			
			eval {
				my($handler)=BaclavaSAX->new((defined($isExample) || ($miniIOMode eq 'I'))?'input':'output',$outputDoc,$root);
				my($parser)=XML::LibXML->new(Handler=>$handler);
				$parser->parse_file($minibacio);
			};
			if($@) {
				print $query->header(-status=> '404 Not Found'),
					$query->start_html('IWWEMproxy Problems'),
					$query->h2('Request not processed because '.$@);
				return;
			}
		}
		
		$charset='UTF-8';
		$dec=encode($charset,$outputDoc->toString());
		$asMime='application/xml';
		$withName=undef;
	}
	
	$dec=''  unless(defined($dec));
	
	$asMime='text/plain'  unless(defined($asMime));
	
	my(@headerPars)=(-type=>$asMime);
	my(%allowedMimeCharset)=(
		'text/plain'=>1,
		'application/xml'=>1,
		'text/xml'=>1
	);
	$charset='UTF-8'  if(!defined($charset) && exists($allowedMimeCharset{$asMime}));
	push(@headerPars,-charset=>$charset)  if(defined($charset));
	
	# Guessing the extension
	if(defined($withName)) {
		my($ext);
		$ext='xml'  if($asMime eq 'text/xml');
		my($MIMEFILE);
		if(!defined($ext) && open($MIMEFILE,'<',$IWWEM::WorkflowCommon::ETCDIR.'/mime.types')) {
			my(@mimelines)=<$MIMEFILE>;
			close($MIMEFILE);
			my(@greplines)=grep(/^$asMime[ \t]+\w+/,@mimelines);
			if(scalar(@greplines)>0) {
				$ext = $greplines[0];
				chomp($ext);
				$ext =~ s/^[^ \t]+[ \t]+//;
				$ext =~ s/[ \t]+.+$//;
				$withName .= ".$ext"  if(length($ext)>0);
			}
		}
	}
	
	doAnswer($query,$dec,$aFile,@headerPars,$withName);
}

sub processBaclavaQuery($$$$$$$$$$$$) {
	my($query,$retval,$jobId,$asMime,$step,$iteration,$IOMode,$IOPath,$bundle64,$withName,$charset,$raw)=@_;
	
	my($bacio)=undef;
	my($facet)=undef;
	my($isExample)=undef;
	my($origJobId)=$jobId;
	my($p_path)=undef;
	my($aFile)=undef;
	($retval,$jobId,$p_path,$facet,$bacio,$isExample,$aFile)=IWWEMproxy::parseBaclavaQuery($query,$retval,$jobId,$asMime,$step,$iteration,$IOMode,$IOPath,$bundle64,$withName);
	
	# We must signal here errors and exit
	if($retval ne '0' || $query->cgi_error()) {
		my $error = $query->cgi_error;
		$error = '500 Internal Server Error'  unless(defined($error));
		print $query->header(-status=>$error),
			$query->start_html('IWWEMproxy Problems'),
			$query->h2('Request not processed because some parameter was not properly provided'.(($retval ne '0')?" (Errcode=$retval)":'')),
			$query->strong($error);
		exit 0;
	}
	
	IWWEMproxy::doBaclavaQuery($query,$origJobId,$jobId,@{$p_path},$facet,$bacio,$isExample,$aFile,$asMime,$step,$iteration,$IOMode,$IOPath,$bundle64,$withName,$charset,$raw);
}

1;
